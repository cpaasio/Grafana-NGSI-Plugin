#### Data-Source Plugin for Grafana
This demo plugin illustrates how to access the Fiware COMET component in order to send data queries, receive the response data, transform it into Grafana Response Format and return it to Grafana to visualize them. It uses the Grafana time-series format to process data with only temporal meta-data and the Grafana tabular format to visualize location meta-data on a world map.
In order to use other output data formats, e.g. for non-standard Grafana panels, the data output part of ```datasource.js``` can be adapted to meet the respective needs.
