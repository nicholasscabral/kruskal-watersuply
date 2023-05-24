const defaultNodes = [
  { id: "A" },
  { id: "B" },
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

const calculateDistance = (node1, node2) => {
  const pos1 = node1.position();
  const pos2 = node2.position();
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  const distance = Math.sqrt(dx * dx + dy * dy);
  console.log({ distance, a: parseInt(distance) });
  return Math.floor(parseInt(distance / 50));
};

let cy = cytoscape({
  container: document.getElementById("cy"),

  boxSelectionEnabled: false,
  autounselectify: true,

  style: [
    {
      selector: "node",
      style: {
        label: (element) => element.data("id"),
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

let sourceNodeId = null;
let sourceNode = null;

cy.on("tap", "node", function (event) {
  const node = event.target;

  if (sourceNodeId === null) {
    sourceNodeId = node.id();
    sourceNode = node;
    sourceNode.addClass("selected");
  } else {
    const newEdgeId = "NewEdge_" + Date.now();

    const targetNodeId = node.id();

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
});

cy.on("tap", function (event) {
  if (event.target === cy) {
    const newNodeId = "NewNode_" + Date.now();

    const position = event.position || event.cyPosition;

    cy.add({
      data: { id: newNodeId, name: "New Node" },
      position: { x: position.x, y: position.y },
    });

    if (sourceNodeId !== null) {
      const newEdgeId = "NewEdge_" + Date.now();

      cy.add({
        data: { id: newEdgeId, source: sourceNodeId, target: newNodeId },
      });

      sourceNodeId = null;
    }

    cy.layout().run();
  }
});

cy.on("position", "node", function (event) {
  const node = event.target;
  const connectedEdges = node.connectedEdges();

  connectedEdges.forEach((edge) => {
    const sourceNode = edge.source();
    const targetNode = edge.target();
    const distance = calculateDistance(sourceNode, targetNode);

    edge.data("weight", distance.toFixed(2));
  });

  cy.style().update();
});
