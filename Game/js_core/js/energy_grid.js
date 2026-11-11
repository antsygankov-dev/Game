import { distance } from './math_utils.js';
import { TOWER_STATS } from './constants.js';

export class EnergyGrid {
    static optimize(towers, generator) {
        if (towers.length === 0) return { edges: [], cableCost: 0 };

        const nodes = [{ ...generator, isGen: true }, ...towers];
        const inMST = new Set([0]);
        const edges = [];
        let totalLength = 0;

        towers.forEach(t => t.isPowered = false);

        while (inMST.size < nodes.length) {
            let minDist = Infinity;
            let bestU = -1, bestV = -1;

            for (let u of inMST) {
                for (let v = 0; v < nodes.length; v++) {
                    if (inMST.has(v)) continue;
                    const d = distance(nodes[u].x, nodes[u].y, nodes[v].x, nodes[v].y);
                    if (d < minDist) {
                        minDist = d; bestU = u; bestV = v;
                    }
                }
            }

            if (bestV !== -1) {
                inMST.add(bestV);
                edges.push([nodes[bestU], nodes[bestV]]);
                totalLength += minDist;
                if (!nodes[bestV].isGen) nodes[bestV].isPowered = true;
            } else break;
        }

        return { edges, cableCost: totalLength * TOWER_STATS.cableCostPerPx };
    }
}