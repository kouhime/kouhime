import {
    loadSceneForNode
} from "./sprite.js";
const createEl = (tag, {
    props = {},
    style = {}
} = {}, parent) => {
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, style);
    if (parent) parent.appendChild(el);
    return el;
};
export const createNode = (x, y, editor, nodes, makeDraggableCallback, config = {}) => {
    const id = config.id || crypto.randomUUID();
    const node = createEl("div", {
        props: {
            id,
            className: "node absolute bg-white bg-opacity-5 hover:scale-110 active:scale-90 transition border border-[#343740] shadow px-4 py-2 rounded cursor-move select-none"
        },
        style: {
            left: `${x}px`,
            top: `${y}px`
        }
    });
    node.dataset.id = id;
    createEl("div", {
        props: {
            className: "font-semibold mb-2 text-white",
            textContent: config.title || "Untitled"
        }
    }, node);
    const inputConnector = createEl("div", {
        props: {
            className: "node-input-connector bg-blue-500 connector rounded-full absolute"
        },
        style: {
            left: "-6px",
            top: "50%",
            transform: "translateY(-50%)"
        }
    }, node);
    const rowsContainer = createEl("div", {
        props: {
            className: "space-y-2"
        }
    }, node);
    makeDraggableCallback(node);
    editor.appendChild(node);
    const nodeData = {
        id,
        element: node,
        rows: [],
        inputConnector,
        rowsContainer,
        scene: {
            background: null,
            sprites: []
        },
        dialogue: "",
        speaker: ""
    };
    nodes.push(nodeData);
    return nodeData;
};
export const makeDraggable = el => {
    let offsetX, offsetY, isDragging = false;
    el.addEventListener("click", e => {
        el.dispatchEvent(new CustomEvent("nodeToConnect", {
            detail: {
                node: el
            },
            bubbles: true
        }));
    });
    el.addEventListener("mousedown", e => {
        const sidebar = document.getElementById("sidebar");
        if (!sidebar.classList.contains("hidden")) return;
        if (e.target.classList.contains("connector")) return;
        isDragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        el.style.zIndex = 1000;
    });
    document.addEventListener("mousemove", e => {
        if (!isDragging) return;
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
    });
    el.addEventListener("dblclick", () =>
        el.dispatchEvent(new CustomEvent("nodeSelected", {
            detail: {
                node: el
            },
            bubbles: true
        }))
    );
    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        el.dispatchEvent(new CustomEvent("updateConnection", {
            bubbles: true
        }));
        el.style.zIndex = "";
    });
};
export const selectNode = (node, sidebar, editor, nodes) => {
    nodes.forEach(n => n.element.classList.remove("border-2", "border-blue-500"));
    node.classList.add("border-2", "border-blue-500");
    sidebar.classList.remove("hidden");
    const nodeTitle = node.querySelector("div.font-semibold").textContent;
    sidebar.querySelector("#nodeTitle").textContent = nodeTitle;
    const nodeItems = sidebar.querySelector("#nodeItems");
    nodeItems.innerHTML = "";
    const nodeData = nodes.find(n => n.id === node.dataset.id);
    console.log(nodeData);
    document.getElementById("speakerInput").value = nodeData.speaker || "";
    if (window.dialogueEditor) {
        window.dialogueEditor.value(nodeData.dialogue || "");
    } else {
        document.getElementById("dialogueInput").value = nodeData.dialogue || "";
    }
    nodeData.rows.forEach(({
        row
    }) => {
        const itemDiv = document.createElement("div");
        itemDiv.textContent = row.dataset.id;
        nodeItems.appendChild(itemDiv);
    });
    const rect = node.getBoundingClientRect();
    const nodeAbsoluteX = rect.left + window.pageXOffset;
    const nodeAbsoluteY = rect.top + window.pageYOffset;
    const nodeCenterX = nodeAbsoluteX + rect.width / 2;
    const nodeCenterY = nodeAbsoluteY + rect.height / 2;
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const targetScrollX = nodeCenterX - viewportCenterX;
    const targetScrollY = nodeCenterY - viewportCenterY;
    loadSceneForNode(nodeData);
    window.selectedNodeData = nodeData;
    window.scrollTo({
        left: targetScrollX,
        top: targetScrollY,
        behavior: "smooth"
    });
};
export const duplicateNode = (originalNodeData, editor, nodes, makeDraggableCallback) => {
    const originalNodeRect = originalNodeData.element.getBoundingClientRect();
    const offsetX = 50;
    const offsetY = 50;
    const x = originalNodeRect.left + window.scrollX + offsetX;
    const y = originalNodeRect.top + window.scrollY + offsetY;
    const newNodeData = createNode(x, y, editor, nodes, makeDraggableCallback, {
        title: originalNodeData.element.querySelector('.font-semibold').textContent + " Copy"
    });
    newNodeData.dialogue = originalNodeData.dialogue;
    newNodeData.speaker = originalNodeData.speaker;
    newNodeData.scene.background = originalNodeData.scene.background;
    newNodeData.scene.sprites = originalNodeData.scene.sprites.map(sprite => ({...sprite}));
    originalNodeData.rows.forEach(originalRow => {
        const itemDetails = {...originalRow.row.itemDetails};
        createRow(newNodeData, itemDetails, document.getElementById('connections'), nodes, []);
    });
    originalNodeData.rows.forEach(originalRow => {
        if (originalRow.row.itemDetails.connectionTarget) {
            const targetNodeId = originalRow.row.itemDetails.connectionTarget;
            const targetNode = nodes.find(n => n.id === targetNodeId);
            if (targetNode) {
                const newItemRow = newNodeData.rows.find(row => row.row.itemDetails.title === originalRow.row.itemDetails.title);
                if (newItemRow) {
                    newItemRow.row.itemDetails.connectionTarget = targetNodeId; 
                }
            }
        }
    });
    return newNodeData;
};