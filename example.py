"""
# Dijkstra's Shortest Path Algorithm

Finds the shortest path between two vertices in a weighted graph.
Uses a **min-heap** to always explore the nearest unexplored vertex first.
Once a vertex is visited, no shorter path to it can exist.

> Source: [TheAlgorithms/Python](https://github.com/TheAlgorithms/Python/blob/master/graphs/dijkstra.py)
>
> Rendered: [Online Renderer](https://explicode.com/view/github/benatfroemming/explicode/example.py)

## Pseudo-code

~~~
DIJKSTRA(graph G, start vertex s, destination vertex d):
1  let H = min heap, initialized with (0, s)
2  while H is non-empty:
3    remove (cost, U) from H
4    if U explored: go to line 2
5    mark U as explored
6    if U == d: return cost
7    for each edge (U, V) with cost c:
8      if V explored: skip
9      push (cost + c, V) onto H
~~~

The min-heap guarantees the first time we reach a vertex it's via the shortest
path — so we never need to revisit it.
"""

import heapq


"""
Returns the cost of the shortest path between vertices `start` and `end`.  
Returns `-1` if no path exists.  
`>>> dijkstra(G, "E", "C")`  
`6`  
`>>> dijkstra(G2, "E", "F")`  
`3`  
`>>> dijkstra(G3, "E", "F")`  
`3`
"""
def dijkstra(graph, start, end):
    heap = [(0, start)]  # cost from start node, current node
    visited = set()
    while heap:
        (cost, u) = heapq.heappop(heap)
        if u in visited:
            continue
        visited.add(u)
        if u == end:
            return cost
        for v, c in graph[u]:
            if v in visited:
                continue
            heapq.heappush(heap, (cost + c, v))
    return -1


"""
## Example Graphs

### G — Undirected

```mermaid
graph LR
    A -- 2 --- B
    A -- 5 --- C
    B -- 3 --- D
    B -- 1 --- E
    B -- 1 --- F
    C -- 3 --- F
    E -- 3 --- F
```
"""

G = {
    "A": [["B", 2], ["C", 5]],
    "B": [["A", 2], ["D", 3], ["E", 1], ["F", 1]],
    "C": [["A", 5], ["F", 3]],
    "D": [["B", 3]],
    "E": [["B", 4], ["F", 3]],
    "F": [["C", 3], ["E", 3]],
}

"""
### G2 — Directed with shortcut

```mermaid
graph LR
    E -- 1 --> B -- 1 --> C -- 1 --> D -- 1 --> F
    E -- 3 --> F
```
"""

G2 = {
    "B": [["C", 1]],
    "C": [["D", 1]],
    "D": [["F", 1]],
    "E": [["B", 1], ["F", 3]],
    "F": [],
}

"""
### G3 — Directed with intermediate node

```mermaid
graph LR
    E -- 1 --> B -- 1 --> C -- 1 --> D -- 1 --> F
    E -- 2 --> G -- 1 --> F
```
"""

G3 = {
    "B": [["C", 1]],
    "C": [["D", 1]],
    "D": [["F", 1]],
    "E": [["B", 1], ["G", 2]],
    "F": [],
    "G": [["F", 1]],
}

short_distance = dijkstra(G, "E", "C")
print(short_distance)  # E → F → C = 6

short_distance = dijkstra(G2, "E", "F")
print(short_distance)  # E → F = 3

short_distance = dijkstra(G3, "E", "F")
print(short_distance)  # E → G → F = 3

if __name__ == "__main__":
    import doctest
    doctest.testmod()