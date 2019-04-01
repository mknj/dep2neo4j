# intro

This program calculates you application dependencies and saves them as a neo4j graph.

# usage

```
# Start neo4j
docker run -d -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=none neo4j
# wait until http://localhost:7474/browser/ is ready, then
node dep2neo4j app.js
```

The following cypher statement can be used to find the entry node
```
MATCH (a) WHERE NOT ()-[]->(a) RETURN a
```
