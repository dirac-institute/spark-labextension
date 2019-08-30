from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler

from kubernetes import client, config
import json
import os
import getpass

kube_client = None
current_namespace = None
current_user = None

class KubernetesHandler(IPythonHandler):
    def get(self):
        try:
            pods = kube_client.list_namespaced_pod(current_namespace).to_dict()
        except Exception as e:
            print(e)
            refresh_kube_client()
            pods = kube_client.list_namespaced_pod(current_namespace).to_dict()

        spark_pods = [pod for pod in pods['items'] if f"{current_user}-spark" in pod['metadata']['name']]
        pod_phases = ["Pending", "Running", "Succeeded", "Failed", "Unknown"]
        spark_pods_phases = {phase : [pod for pod in spark_pods if pod['status']['phase'] == phase ] 
                            for phase in pod_phases}
        spark_uids = { phase : [ pod['metadata']['uid'] for pod in items] for phase, items in spark_pods_phases.items()}

        events = kube_client.list_namespaced_event(current_namespace).to_dict()

        spark_events_phases = { phase : [event for event in events['items'] if event['involved_object']['uid'] in uids]
                            for phase, uids in spark_uids.items()}

        spark_pod_events = { phase : { pod['metadata']['name'] : [event for event in spark_events_phases[phase] if event['involved_object']['uid'] == spark_uids[phase][i]]
                for i, pod in enumerate(pods) } for phase, pods in spark_pods_phases.items() }

        messages = { phase : { name : events[-1]['message'] for name, events in spark_pod_events[phase].items() } 
            for phase in spark_pod_events.keys()
           }

        self.finish(json.dumps(messages, default=str))

def refresh_kube_client():
    global kube_client
    global current_namespace
    global current_user

    # Configs can be set in Configuration class directly or using helper utility
    try:
        config.load_kube_config(config_file=os.environ["KUBECONFIG"])
    except:
        config.load_incluster_config()

    try:
        current_namespace = os.environ["KUBENAMESPACE"]
    except:
        current_namespace = open("/var/run/secrets/kubernetes.io/serviceaccount/namespace").read()

    try:
        current_user = os.environ["NB_USER"]
    except:
        current_user = getpass.getuser()

    kube_client = client.CoreV1Api()

def load_jupyter_server_extension(nb_server_app):
    """
    Called when the extension is loaded.

    Args:
        nb_server_app (NotebookWebApplication): handle to the Notebook webserver instance.
    """
    print("Loading spark_labextension.")

    refresh_kube_client()

    web_app = nb_server_app.web_app
    host_pattern = '.*$'
    k8s_pattern = url_path_join(web_app.settings['base_url'], '/k8s')
    routes = [
        (k8s_pattern, KubernetesHandler)]

    web_app.add_handlers(host_pattern, routes)
