var $            = require('jquery');
var FlightsMap = require('./flights-map');

$(document).ready(function() 
{
  var map = new FlightsMap("#schedules_map", 
  {
    show_voronoi: false,
    flights: "flights.json", 
    stations: "stations.json" 
  });

  $("#reset").click(function() { map.reset(); });
  $("#zoom_in").click(function() { map.zoom_in(); });
  $("#zoom_out").click(function() { map.zoom_out(); });
  $("#show_schedules").click(function() { map.show_schedules(); });
});