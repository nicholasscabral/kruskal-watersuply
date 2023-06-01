const defaultNodes = [{ data: { id: "A" } }, { data: { id: "B" } }];

const DRAW_INTERVAL_IN_MS = 2000;
const DIVISOR_CONSTANT = 60;

let selectedNode = null;
let lastNodeId = defaultNodes.at(-1).data.id;
let isPaused = false;
let drawingMstAsyncFunction = null;

/////////// utils functions ///////////

function calculateDistance(source, target) {
  const pos1 = source.position();
  const pos2 = target.position();
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.floor(distance / DIVISOR_CONSTANT);
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

function findGraphEdgeByNodes(edges, source, target) {
  return edges.find(
    (edge) => edge.source().id() == source && edge.target().id() == target
  );
}

function drawMST(mstEdges) {
  let i = 0;
  drawingMstAsyncFunction = setInterval(() => {
    if (i == mstEdges.length) {
      updateStatusLabel("Finalizado");
      handleFinishDrawing(mstEdges);
      clearInterval(drawingMstAsyncFunction);
    }
    if (!isPaused) {
      mstEdges[i].addClass("connected");
      i++;
      cy.style().update();
    }
  }, DRAW_INTERVAL_IN_MS);
}

function getEdgeData(edge) {
  const node1 = edge.source();
  const node2 = edge.target();
  const weight = calculateDistance(node1, node2);
  return { node1: node1.id(), node2: node2.id(), weight };
}

/////////// global state functions ///////////

function setSelectedNode(node) {
  selectedNode = node;
  selectedNode.addClass("selected");
}

function resetSelectedNode() {
  selectedNode.removeClass("selected");
  selectedNode = null;
}

function resetMSTDrawing() {
  cy.elements()
    .edges()
    .forEach((edge) => {
      edge.removeClass("connected");
      edge.removeClass("finished");
    });
  cy.style().update();
}

function updateStatusLabel(status = null) {
  const statusElement = document.getElementById("status");
  if (status) {
    statusElement.innerHTML = `Status: ${status}`;
  } else {
    const statusText = isPaused ? "Pausado" : "Desenhando";
    statusElement.innerHTML = `Status: ${statusText}`;
  }
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

/////////// Algorithms ///////////

function kruskal(edges) {
  const edgesData = edges.map(getEdgeData);

  const mstEdges = []; // Array com as instances das arestas
  const mst = []; // Array vazio para armazenar os valores das arestas da árvore espalhada mínima
  const parent = {}; // Objeto para armazenar o pai de cada nó na árvore
  const rank = {}; // Objeto para armazenar a classificação de cada nó na árvore

  // Ordenar as arestas em ordem crescente de peso
  edgesData.sort((a, b) => a.weight - b.weight);

  // encontrar o pai de um nó usando o algoritmo de compressão de caminho
  function find(node) {
    if (parent[node] !== node) {
      parent[node] = find(parent[node]);
    }
    return parent[node];
  }

  // unir dois conjuntos de nós usando união por rank
  function union(node1, node2) {
    const mstEdge = findGraphEdgeByNodes(edges, node1, node2);
    const root1 = find(node1);
    const root2 = find(node2);

    // Verificar se o conjunto do root1 tem uma classificação menor que o conjunto do root2
    if (rank[root1] < rank[root2]) {
      parent[root1] = root2; // O conjunto do root1 se torna filho do conjunto do root2
    }
    // Verificar se o conjunto do root1 tem uma classificação maior que o conjunto do root2
    else if (rank[root1] > rank[root2]) {
      parent[root2] = root1; // O conjunto do root2 se torna filho do conjunto do root1
    }
    // Caso contrário, ambos têm a mesma classificação, então podemos escolher qualquer um como pai
    else {
      parent[root2] = root1; // O conjunto do root2 se torna filho do conjunto do root1
      rank[root1]++; // Aumentar a classificação do conjunto do root1
    }

    mstEdges.push(mstEdge);
  }

  for (const edge of edgesData) {
    const { node1, node2 } = edge;

    // Inicializar o pai e a classificação dos nós, se ainda não foram inicializados
    if (!parent[node1]) {
      parent[node1] = node1;
      rank[node1] = 0;
    }
    if (!parent[node2]) {
      parent[node2] = node2;
      rank[node2] = 0;
    }

    // Verificar se os nós pertencem a diferentes conjuntos na árvore
    if (find(node1) !== find(node2)) {
      mst.push(edge);

      // Realizar a união dos conjuntos
      union(node1, node2);
    }
  }

  return [mst, mstEdges];
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
}

function handleCalculateMST() {
  resetMSTDrawing();
  clearInterval(drawingMstAsyncFunction);
  drawingMstAsyncFunction = null;
  isPaused = false;
  updateStatusLabel();
  const [mst, mstEdges] = kruskal(cy.elements().edges());
  drawMST(mstEdges);
}

function handlePause() {
  isPaused = true;
  updateStatusLabel();
}

function handlePlay() {
  isPaused = false;
  updateStatusLabel();
}

function handleClearGraph() {
  cy.remove("edges");
  clearInterval(drawingMstAsyncFunction);
  lastNodeId = defaultNodes.at(-1).data.id;
  cy.nodes().forEach((node) => {
    const keep = ["A", "B"];
    const nodeId = node.id();
    if (!keep.includes(nodeId)) {
      cy.remove(node);
    }
  });
}

function handleFinishDrawing(mstEdges) {
  mstEdges.forEach((edge) => {
    edge.removeClass("connected");
    edge.addClass("finished");
  });
  cy.style().update();
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
        "background-image": "assets/water-supply.jpg",
        "border-color": "#000",
        "border-width": 3,
        "border-opacity": 0.5,
      },
    },
    {
      selector: ".selected",
      style: {
        "border-color": "blue",
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
    {
      selector: ".connected",
      style: {
        "line-color": "blue",
        width: 12,
      },
    },
    {
      selector: ".finished",
      style: {
        "line-color": "green",
        width: 12,
      },
    },
  ],

  elements: {
    nodes: defaultNodes,
    edges: [],
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

cy.on("tap", handleCanvasClick); // tap on canva
cy.on("tap", "node", handleNodeClick); // tap on node
cy.on("position", "node", handleNodeMove); // move node
$("#start").click(handleCalculateMST);
$("#play").click(handlePlay);
$("#pause").click(handlePause);
$("#clear").click(handleClearGraph);
