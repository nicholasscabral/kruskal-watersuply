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

let selectedNode = null;
let lastNodeId = defaultNodes.at(-1).data.id;

/////////// utils functions ///////////

function calculateDistance(source, target) {
  const pos1 = source.position();
  const pos2 = target.position();
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.floor(distance / 50);
}

function updateEdgesWeights(node) {
  const connectedEdges = node.connectedEdges();

  connectedEdges.forEach((edge) => {
    const sourceNode = edge.source();
    const targetNode = edge.target();
    const distance = calculateDistance(sourceNode, targetNode);

    edge.data("weight", distance);
  });

  cy.style().update();
}

function getFormattedGraphEdges(edges) {
  const graphEdges = [];

  for (const edge of edges) {
    const node1 = edge.source().id();
    const node2 = edge.target().id();
    const weight = edge.data("weight");

    graphEdges.push({ node1, node2, weight });
  }
  return graphEdges;
}

function setSelectedNode(node) {
  selectedNode = node;
  selectedNode.addClass("selected");
}

function resetSelectedNode() {
  selectedNode.removeClass("selected");
  selectedNode = null;
}

/////////// behavior functions ///////////

function createEdge(source, target) {
  const sourceNodeId = source.id();
  const targetNodeId = target.id();
  const newEdgeId = `${sourceNodeId}_${targetNodeId}`;
  const distance = calculateDistance(source, target);
  const newEdge = {
    data: {
      id: newEdgeId,
      source: sourceNodeId,
      target: targetNodeId,
      weight: distance,
    },
  };
  cy.add(newEdge);
  resetSelectedNode();
}

function createNode(event) {
  const newNodeId = String.fromCharCode(lastNodeId.charCodeAt(0) + 1);
  const position = event.position || event.cyPosition;
  const newNode = {
    data: { id: newNodeId },
    position: { x: position.x, y: position.y },
  };
  cy.add(newNode);

  if (selectedNode) {
    createEdge(selectedNode, newNode);
  }

  lastNodeId = newNodeId;
}

/////////// events callbacks /////////

function handleNodeClick(event) {
  const node = event.target;

  if (!selectedNode) {
    setSelectedNode(node);
  } else {
    selectedNode === node
      ? resetSelectedNode()
      : createEdge(selectedNode, node);
  }
}

function handleCanvasClick(event) {
  if (event.target !== cy) return;
  createNode(event);

  cy.layout().run();
}

function handleNodeMove(event) {
  const grabbedNode = event.target;
  updateEdgesWeights(grabbedNode);
  // move this to a button when implementation is fineshed
  getFormattedGraphEdges(cy.elements().edges());
}

function kruskal(edges) {
  const mst = [];
  const parent = {};
  const rank = {};
  edges.sort((a, b) => a.weight - b.weight);
  function find(node) {
    if (parent[node] !== node) {
      parent[node] = find(parent[node]);
    }
    return parent[node];
  }

  function union(node1, node2) {
    const root1 = find(node1);
    const root2 = find(node2);

    if (rank[root1] < rank[root2]) {
      parent[root1] = root2;
    } else if (rank[root1] > rank[root2]) {
      parent[root2] = root1;
    } else {
      parent[root2] = root1;
      rank[root1]++;
    }
  }

  for (const edge of edges) {
    const { node1, node2, weight } = edge;

    if (!parent[node1]) {
      parent[node1] = node1;
      rank[node1] = 0;
    }
    if (!parent[node2]) {
      parent[node2] = node2;
      rank[node2] = 0;
    }

    if (find(node1) !== find(node2)) {
      mst.push(edge);

      union(node1, node2);
    }
  }

  return mst;
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
        "border-width": 6,
      },
    },
    {
      selector: "edge",
      style: {
        label: (ele) => `R$${ele.data("weight")} milhões`,
        width: 6,
        "curve-style": "bezier",
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

cy.zoom({
  level: 1,
  renderedPosition: { x: 1200, y: 600 },
});
cy.zoomingEnabled(false);

cy.on("tap", handleCanvasClick);
cy.on("tap", "node", handleNodeClick);
cy.on("position", "node", handleNodeMove);
