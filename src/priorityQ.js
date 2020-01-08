import PriorityQueue from "priorityqueue";

class Order {
    constructor(id, dist, demand, capacity) {
        this.id = id;
        this.dist = dist;
        this.demand = demand;
        this.capacity = capacity;
    }
}

const numericCompare = (a, b) => (a > b ? 1 : a < b ? -1 : 0);

const comparator = (a, b) => {
    const x = numericCompare(a.demand, b.demand);
    const y = numericCompare(b.dist, a.dist);
    return x ? x : y;
};

const pq = new PriorityQueue({ comparator });

pq.push(new Point(4, 6));
pq.push(new Point(2, 3));
pq.push(new Point(5, 1));
pq.push(new Point(1, 2));
console.log(pq.pop()); // => {x: 5, y: 1}
console.log(pq.top()); // => {x: 4, y: 6}
pq.push(new Point(3, 4));
pq.push(new Point(6, 5));
console.log(pq.length); // => 5
console.log(pq.top()); // => {x: 6, y: 5}