export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface OctreeNode<T> {
  bounds: BoundingBox;
  depth: number;
  entities: T[];
  children: Array<OctreeNode<T> | null>;
  isLeaf: boolean;
}

export class AdaptiveOctree<T extends { position: [number, number, number] }> {
  private root: OctreeNode<T>;
  private maxDepth: number;
  private maxEntitiesPerNode: number;
  public maxDepthReached = 0;

  constructor(bounds: BoundingBox, maxDepth = 40, maxEntitiesPerNode = 64) {
    this.root = this.createNode(bounds, 0);
    this.maxDepth = maxDepth;
    this.maxEntitiesPerNode = maxEntitiesPerNode;
  }

  insert(entity: T): void {
    this.insertInto(this.root, entity);
  }

  querySphere(center: [number, number, number], radius: number): T[] {
    const results: T[] = [];
    this.querySphereNode(this.root, center, radius, results);
    return results;
  }

  private createNode(bounds: BoundingBox, depth: number): OctreeNode<T> {
    return {
      bounds,
      depth,
      entities: [],
      children: new Array(8).fill(null),
      isLeaf: true
    };
  }

  private insertInto(node: OctreeNode<T>, entity: T): void {
    if (node.isLeaf) {
      node.entities.push(entity);
      if (node.entities.length > this.maxEntitiesPerNode && node.depth < this.maxDepth) {
        this.subdivide(node);
      }
      return;
    }

    const octant = this.getOctant(node.bounds, entity.position);
    if (!node.children[octant]) {
      node.children[octant] = this.createNode(this.getChildBounds(node.bounds, octant), node.depth + 1);
    }
    this.insertInto(node.children[octant] as OctreeNode<T>, entity);
  }

  private subdivide(node: OctreeNode<T>): void {
    node.isLeaf = false;
    const entities = node.entities.splice(0);
    for (const entity of entities) {
      this.insertInto(node, entity);
    }
    this.maxDepthReached = Math.max(this.maxDepthReached, node.depth + 1);
  }

  private querySphereNode(node: OctreeNode<T>, center: [number, number, number], radius: number, results: T[]): void {
    if (!this.sphereIntersectsBox(center, radius, node.bounds)) return;

    if (node.isLeaf) {
      for (const entity of node.entities) {
        if (this.distance(entity.position, center) <= radius) {
          results.push(entity);
        }
      }
      return;
    }

    for (const child of node.children) {
      if (child) this.querySphereNode(child, center, radius, results);
    }
  }

  private getOctant(bounds: BoundingBox, pos: [number, number, number]): number {
    const cx = (bounds.min[0] + bounds.max[0]) / 2;
    const cy = (bounds.min[1] + bounds.max[1]) / 2;
    const cz = (bounds.min[2] + bounds.max[2]) / 2;

    return (pos[0] >= cx ? 4 : 0) + (pos[1] >= cy ? 2 : 0) + (pos[2] >= cz ? 1 : 0);
  }

  private getChildBounds(bounds: BoundingBox, octant: number): BoundingBox {
    const cx = (bounds.min[0] + bounds.max[0]) / 2;
    const cy = (bounds.min[1] + bounds.max[1]) / 2;
    const cz = (bounds.min[2] + bounds.max[2]) / 2;

    return {
      min: [
        octant & 4 ? cx : bounds.min[0],
        octant & 2 ? cy : bounds.min[1],
        octant & 1 ? cz : bounds.min[2]
      ],
      max: [
        octant & 4 ? bounds.max[0] : cx,
        octant & 2 ? bounds.max[1] : cy,
        octant & 1 ? bounds.max[2] : cz
      ]
    };
  }

  private sphereIntersectsBox(c: [number, number, number], r: number, b: BoundingBox): boolean {
    let dSq = 0;
    for (let i = 0; i < 3; i++) {
      if (c[i] < b.min[i]) dSq += (b.min[i] - c[i]) ** 2;
      else if (c[i] > b.max[i]) dSq += (c[i] - b.max[i]) ** 2;
    }
    return dSq <= r * r;
  }

  private distance(a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  }
}
