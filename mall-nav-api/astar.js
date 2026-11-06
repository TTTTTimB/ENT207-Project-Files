/**
 * @param {Object} adj 邻接表 adj[nodeId] = [{id, weight}]
 * @param {Object} nodes 节点字典 nodes[id] = {x,y,floor_id}
 * @param {number} startId 起点node id
 * @param {number} endId 终点node id
 * @returns {number[] | null} 路径id数组
 */
function aStar(adj, nodes, startId, endId) {
  // 启发函数：欧氏距离
  const heuristic = (aId, bId) => {
    const a = nodes[aId];
    const b = nodes[bId];
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  };

  const openSet = new Set([startId]);
  const cameFrom = {};

  const gScore = {};
  const fScore = {};
  for (const id of Object.keys(nodes)) {
    gScore[id] = Infinity;
    fScore[id] = Infinity;
  }
  gScore[startId] = 0;
  fScore[startId] = heuristic(startId, endId);

  while (openSet.size > 0) {
    // 取出 fScore 最小节点
    let current = null;
    let minF = Infinity;
    for (const nId of openSet) {
      if (fScore[nId] < minF) {
        minF = fScore[nId];
        current = nId;
      }
    }

    if (current == endId) {
      // 回溯路径
      const path = [];
      let cur = current;
      while (cameFrom[cur]) {
        path.push(Number(cur));
        cur = cameFrom[cur];
      }
      path.push(Number(startId));
      return path.reverse();
    }

    openSet.delete(current);

    for (const neighbor of adj[current]) {
      const tentativeG = gScore[current] + neighbor.weight;
      if (tentativeG < gScore[neighbor.id]) {
        cameFrom[neighbor.id] = current;
        gScore[neighbor.id] = tentativeG;
        fScore[neighbor.id] = gScore[neighbor.id] + heuristic(neighbor.id, endId);
        openSet.add(neighbor.id);
      }
    }
  }
  return null; // 无路径
}

module.exports = aStar;
