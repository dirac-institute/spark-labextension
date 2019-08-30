import { MainAreaWidget, IFrame } from '@jupyterlab/apputils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Menu, Widget, } from '@phosphor/widgets';
/**
 * Initialization data for the spark-labextension extension.
 */
const extension = {
    id: 'spark-labextension',
    autoStart: true,
    requires: [IMainMenu],
    // activate: (app: JupyterFrontEnd) => {
    activate: (app, mainMenu) => {
        console.log('JupyterLab extension spark-labextension is activated!');
        let namespace = 'spark-ui';
        let counter = 0;
        app.commands.addCommand("ui:open", {
            label: 'Application UI',
            execute: args => {
                // define the url to access
                const url = 'https://hub.dirac.astro.washington.edu/user/stevenstetzler/proxy/4040/jobs/';
                // make an IFrame to capture the content of the url
                let content = new IFrame();
                content.url = url;
                content.title.label = "Spark App UI";
                content.id = `${namespace}-${++counter}`;
                content.sandbox = ["allow-scripts", "allow-same-origin"];
                let widget = new MainAreaWidget({ content });
                if (!widget.isAttached) {
                    // Attach the widget to the main work area if it's not there
                    app.shell.add(widget, 'main');
                }
                // Activate the widget
                app.shell.activateById(widget.id);
            }
        });
        async function fetch_content() {
            const url = 'https://localhost:8888/k8s';
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                console.log(data);
                return data;
            }
            else {
                const data = await response.json();
                if (data.error) {
                    console.log(data.error.message);
                }
                else {
                    console.log(response.statusText);
                }
                return null;
            }
        }
        app.commands.addCommand("ui:k8s:open", {
            label: 'Kubernetes',
            execute: async (args) => {
                // define the url to access
                // make an IFrame to capture the content of the url
                let content = new Widget();
                content.addClass("k8s-widget");
                let k8s_parent = document.createElement("div");
                let k8s_pending = document.createElement("div");
                let k8s_running = document.createElement("div");
                let k8s_failed = document.createElement("div");
                let pending_heading = document.createElement("h1");
                let running_heading = document.createElement("h1");
                let failed_heading = document.createElement("h1");
                let pending_messages = document.createElement("div");
                let running_messages = document.createElement("div");
                let failed_messages = document.createElement("div");
                pending_heading.innerText = "Pending";
                running_heading.innerText = "Running";
                failed_heading.innerText = "Failed";
                content.node.appendChild(k8s_parent);
                k8s_parent.appendChild(k8s_pending);
                k8s_pending.appendChild(pending_heading);
                k8s_pending.appendChild(pending_messages);
                k8s_parent.appendChild(k8s_running);
                k8s_running.appendChild(running_heading);
                k8s_running.appendChild(running_messages);
                k8s_parent.appendChild(k8s_failed);
                k8s_failed.appendChild(failed_heading);
                k8s_failed.appendChild(failed_messages);
                function deleteChildren(e) {
                    var child = e.lastElementChild;
                    while (child) {
                        e.removeChild(child);
                        child = e.lastElementChild;
                    }
                }
                setInterval(function () {
                    fetch_content().then(function (data) {
                        if (data) {
                            deleteChildren(pending_messages);
                            deleteChildren(running_messages);
                            deleteChildren(failed_messages);
                            for (var phase in data) {
                                let pods_messages = data[phase];
                                for (var pod in pods_messages) {
                                    let k8s_pod = document.createElement("h3");
                                    k8s_pod.setAttribute("class", "k8s-pod");
                                    let k8s_message = document.createElement("p");
                                    k8s_message.setAttribute("class", "k8s-message");
                                    k8s_pod.innerText = pod;
                                    k8s_message.innerText = pods_messages[pod];
                                    if (phase == "Pending") {
                                        pending_messages.appendChild(k8s_pod);
                                        pending_messages.appendChild(k8s_message);
                                    }
                                    else if (phase == "Running") {
                                        running_messages.appendChild(k8s_pod);
                                        running_messages.appendChild(k8s_message);
                                    }
                                    else if (phase == "Failed") {
                                        failed_messages.appendChild(k8s_pod);
                                        failed_messages.appendChild(k8s_message);
                                    }
                                }
                            }
                        }
                    });
                }, 1000);
                let widget = new MainAreaWidget({ content });
                widget.id = 'spark-k8s';
                widget.title.label = 'Kubernetes';
                widget.title.closable = true;
                if (!widget.isAttached) {
                    // Attach the widget to the main work area if it's not there
                    // app.shell.add(widget, 'main');
                    app.shell.add(widget, "main");
                }
                // Activate the widget
                app.shell.activateById(widget.id);
                // setInterval(function() {
                //   console.log("Called intervaled function!");
                //   console.log(content.url);
                //   content.url = content.url + "";
                //   // widget.update
                // }, 1000);
            }
        });
        const commands = app.commands;
        const sparkMenu = new Menu({ commands });
        sparkMenu.title.label = "Spark";
        sparkMenu.addItem({ command: "ui:open" });
        sparkMenu.addItem({ command: "ui:k8s:open" });
        mainMenu.addMenu(sparkMenu, { rank: 110 });
    }
};
export default extension;
