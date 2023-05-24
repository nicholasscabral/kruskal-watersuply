const defaultNodes = [
  { data: { id: "A" } },
  { data: { id: "B" } },
  // { data: { id: "C" } },
  // { data: { id: "D" } },
  // { data: { id: "E" } },
];

const defaultEdges = [
  // { data: { source: "A", target: "B", weight: 10 } },
  // { data: { source: "B", target: "C", weight: 10 } },
  // { data: { source: "C", target: "D", weight: 10 } },
  // { data: { source: "D", target: "E", weight: 10 } },
];

let sourceNodeId = null;
let sourceNode = null;
let lastNodeId = defaultNodes.at(-1).data.id;

function calculateDistance(node1, node2) {
  const pos1 = node1.position();
  const pos2 = node2.position();
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.floor(distance / 50);
}

function updateEdgesWeights(selectedNode) {
  const connectedEdges = selectedNode.connectedEdges();

  connectedEdges.forEach((edge) => {
    const sourceNode = edge.source();
    const targetNode = edge.target();
    const distance = calculateDistance(sourceNode, targetNode);

    edge.data("weight", distance);
  });

  cy.style().update();
}

function generateGraphAsObject(edges) {
  const graph = {};

  for (const edge of edges) {
    const sourceNode = edge.source().id();
    const targetNode = edge.target().id();
    const weight = edge.data("weight");

    console.log({ sourceNode, targetNode, weight });

    const edgeObj = { weight, targetNode };

    if (graph[sourceNode]) {
      graph[sourceNode].push(edgeObj);
    } else {
      graph[sourceNode] = [edgeObj];
    }
  }
  return graph;
}

function createEdge(source, target) {
  const newEdgeId = `${source}_${target}`;
  cy.add({
    data: { id: newEdgeId, source, target },
  });
}

function createNode(event) {
  const newNodeId = String.fromCharCode(lastNodeId.charCodeAt(0) + 1);
  const position = event.position || event.cyPosition;
  cy.add({
    data: { id: newNodeId },
    position: { x: position.x, y: position.y },
  });

  if (sourceNodeId) {
    createEdge(sourceNodeId, newNodeId);
    sourceNodeId = null;
  }

  lastNodeId = newNodeId;
}

function handleNodeClick(event) {
  const node = event.target;

  if (sourceNodeId === null) {
    sourceNodeId = node.id();
    sourceNode = node;
    sourceNode.addClass("selected");
  } else {
    const targetNodeId = node.id();

    const newEdgeId = `${sourceNodeId}_${targetNodeId}`;
    cy.add({
      data: {
        id: newEdgeId,
        source: sourceNodeId,
        target: targetNodeId,
        weight: calculateDistance(sourceNode, node),
      },
    });

    sourceNodeId = null;
    sourceNode.removeClass("selected");
  }
}

function handleCanvasClick(event) {
  if (event.target !== cy) return;
  createNode(event);

  cy.layout().run();
}

function handleNodeMove(event) {
  const selectedNode = event.target;
  updateEdgesWeights(selectedNode);
  // move this to a button when implementation is fineshed
  console.log(generateGraphAsObject(cy.elements().edges()));
}

let cy = cytoscape({
  container: document.getElementById("cy"),

  boxSelectionEnabled: false,
  autounselectify: true,

  style: [
    {
      selector: "node",
      style: {
        label: (element) => element.data("id"),
        "font-size": "28px",
        height: 80,
        width: 80,
        "background-fit": "cover",
        "background-image": "assets/water-supply.png",
        "border-color": "#000",
        "border-width": 3,
        "border-opacity": 0.5,
      },
    },
    {
      selector: ".selected",
      style: {
        "border-color": "red",
      },
    },
    {
      selector: "edge",
      style: {
        label: (ele) => ele.data("weight"),
        width: 6,
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "line-color": "black",
        "target-arrow-color": "black",
        "font-size": "28px",
        "text-background-opacity": 1,
        "text-background-color": "white",
        "text-background-shape": "roundrectangle",
        "text-background-padding": "2px",
        "text-background-opacity": 1,
        "text-background-padding": "2px",
        "text-background-color": "white",
        "text-halign": "center",
        "text-valign": "center",
      },
    },
  ],

  elements: {
    nodes: defaultNodes,
    edges: defaultEdges,
  },

  layout: {
    name: "breadthfirst",
    directed: false,
    padding: 10,
  },
});

cy.on("tap", handleCanvasClick);
cy.on("tap", "node", handleNodeClick);
cy.on("position", "node", handleNodeMove);
