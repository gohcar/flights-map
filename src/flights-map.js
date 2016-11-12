var d3       = require("d3");
var WorldMap = require("world-map");

function FlightsMap(containerId, options) 
{ 
  options           = options || {}; 
  options.resources = options.resources || [];

  if (options.flights)  options.resources.push({ name: 'flights',  src: options.flights });
  if (options.stations) options.resources.push({ name: 'stations', src: options.stations });

  WorldMap.call(this, containerId, options);
}


FlightsMap.prototype                 = Object.create(WorldMap.prototype);
FlightsMap.prototype.constructor     = FlightsMap;

FlightsMap.prototype.currentStations = [];

FlightsMap.prototype.options.zoom        = true;
FlightsMap.prototype.options.showVoronoi = false;


FlightsMap.prototype.options.onLoad = function (map) 
{
  var flights          = map.resources.flights;
  var stations         = map.resources.stations;
  var stations_by_iata = d3.map(stations, function (d) { return d.iata; });

  stations.forEach(function (d) 
  {
    d[0] = +d.longitude;
    d[1] = +d.latitude;
    d.arcs = {type: "MultiLineString", coordinates: []};
    d.flights  = 0;
    return d;
  });

  flights.forEach(function (flight) 
  {
    var source = stations_by_iata.get(flight.origin) || {};
    var target = stations_by_iata.get(flight.destination) || {};
    
    if (!source.iata || !target.iata) return;
    
    source.arcs.coordinates.push([source, target]);
    target.arcs.coordinates.push([target, source]);
    source.flights += parseInt(flight.count);     
  });
  
  map.voronoi  = d3.voronoi().extent([[0, 0], [map.width, map.height]]);
  map.stations = stations.filter(function (d, i) { return d.arcs.coordinates.length; });
  map.loaded   = true;

  map.on("mousemove", function () { map.mousemove(this); });
  map.draw();
}


FlightsMap.prototype.options.onDraw = function (map) 
{
  if (!map.loaded) return;

  map.drawStations();
  map.drawVoronoi();
  map.drawFlights();
}


FlightsMap.prototype.drawStations = function ()
{
  for (var i = 0; i < this.stations.length; ++i)
  {
    var station = this.stations[i];
    var coor    = this.projection([station.longitude, station.latitude]);
    var x       = coor[0];
    var y       = coor[1];
    var r = Math.sqrt(station.flights/4); 
        r = r <= 1? 1: (r > 50? 50: r);
    var color   = station.flights? "darkred": "#999900";

    this.context.beginPath();
    this.context.moveTo(x, y);
    this.context.arc(x, y, r, 0, 2 * Math.PI);
    this.context.fillStyle = color;
    this.context.fill();
  }
}


FlightsMap.prototype.getStationsVoronoi = function (real) 
{
  var $this = this;
  this.visible_stations = [];

  var real_stations_pos = this.stations.map(function (d, i)
  {
    var coor = $this.projection([d.longitude, d.latitude]);
    var x    = coor[0] * $this.transform.k;
    var y    = coor[1] * $this.transform.k + $this.transform.y;

    return [x, y];
  });

  var real_visible_stations = real_stations_pos.filter(function (d, i)
  {
    var visible = d[0] >= 0 && d[0] <= $this.width && d[1] >= 0 && d[1] <= $this.height;
    
    if (visible) $this.visible_stations.push($this.stations[i]);

    return visible;
  });

  var stations_pos = real? real_visible_stations: this.visible_stations.map(this.projection);
  var poly_voronoi = this.voronoi.polygons(stations_pos);

  return poly_voronoi;
}


FlightsMap.prototype.drawVoronoi = function () 
{
  if (!this.options.showVoronoi) return;

  var poly_voronoi = this.getStationsVoronoi();

  for (var i = 0; i < poly_voronoi.length; ++i)
  {
    var cell = poly_voronoi[i];
      
    this.context.beginPath();
    this.context.moveTo(cell[0][0], cell[0][1]);
    
    for (var j = 1; j < cell.length; ++j) 
    {
      this.context.lineTo(cell[j][0], cell[j][1]);
    }

    this.context.closePath();    
    this.context.strokeStyle = "#000";
    this.context.stroke();
  }
}


FlightsMap.prototype.drawFlights = function ()
{
  if (!this.currentStations.length) return;

  var $this    = this;
  var stations = this.currentStations;

  if (stations.length == 1)
  {
    var station = stations[0];
    d3.select("#station_name").html(station.iata+(station.flights? "<br>Scheduled flights: "+station.flights :""));  
  }  

  stations.forEach(function (station)
  {
    $this.context.beginPath();
    $this.path(station.arcs);
    $this.context.strokeStyle = "#000";
    $this.context.stroke();
    $this.context.closePath();
  });  
}


FlightsMap.prototype.voronoiGetStation = function (x, y) 
{
  var poly_voronoi = this.getStationsVoronoi(true);

  for (var i = 0; i < poly_voronoi.length; ++i)
  {
    var cell      = poly_voronoi[i];
    var voro_path = new Path2D();

    voro_path.moveTo(cell[0][0], cell[0][1]);

    for (var j = 1; j < cell.length; ++j) 
    {
      voro_path.lineTo(cell[j][0], cell[j][1]);
    }

    voro_path.closePath();
    
    if (this.context.isPointInPath(voro_path, x, y))
    {
      return this.visible_stations[i];
    }
  }
}


FlightsMap.prototype.mousemove = function (event) 
{
  if (this.currentStations.length > 1) return;

  var mouse   = d3.mouse(event);
  var station = this.voronoiGetStation(mouse[0], mouse[1]);

  if (!station)                           return;
  if (station == this.currentStations[0]) return;

  this.setStation(station);
  this.draw();  
}


FlightsMap.prototype.setStation = function (station) 
{
  this.currentStations = [station];  
}


FlightsMap.prototype.showSchedules = function () 
{
  this.currentStations = this.stations; 
  this.draw(); 
}


FlightsMap.prototype.reset = function () 
{
  this.currentStations = [];
  this.resetZoom();
}

module.exports = FlightsMap;