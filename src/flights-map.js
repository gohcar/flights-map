var d3       = require("d3");
var WorldMap = require("world-map");

function FlightsMap(parent, options) 
{
  options = options || {};

  WorldMap.call(this, parent, {
    width:  800,
    height: 400,
    zoom:   true,
    resources: [
      { name: 'flights',  src: options.flights  },
      { name: 'stations', src: options.stations, onload: FlightsMap.onload_stations }
    ],
    onload: FlightsMap.onload_map
  });

  this.show_voronoi = options.show_voronoi;
  this.current_stations = [];
}

FlightsMap.prototype             = Object.create(WorldMap.prototype);
FlightsMap.prototype.constructor = FlightsMap;

FlightsMap.onload_stations = function (map, stations) 
{
  stations.forEach(function (d) 
  {
    d[0] = +d.longitude;
    d[1] = +d.latitude;
    d.arcs = {type: "MultiLineString", coordinates: []};
    d.flights  = 0;
    return d;
  });
}


FlightsMap.onload_map = function(map) 
{
  var flights          = map.resources.flights;
  var stations         = map.resources.stations;
  var stations_by_iata = d3.map(stations, function(d) { return d.iata; });

  flights.forEach(function(flight) 
  {
    var source = stations_by_iata.get(flight.origin) || {};
    var target = stations_by_iata.get(flight.destination) || {};
    
    if (!source.iata || !target.iata) return;
    
    source.arcs.coordinates.push([source, target]);
    target.arcs.coordinates.push([target, source]);
    source.flights += parseInt(flight.count);     
  });
  
  map.voronoi  = d3.voronoi().extent([[0, 0], [map.width, map.height]]);
  map.stations = stations.filter(function(d, i) { return d.arcs.coordinates.length; });
  map.loaded   = true;

  map.on("mousemove", function () { map.mousemove(this); });

  map.draw();
}


FlightsMap.prototype.draw_stations = function()
{
  // transform = transform || {x: 0, y: 0, k: 1};

  for (var i = 0; i < this.stations.length; ++i)
  {
    var station = this.stations[i];
    var coor    = this.projection([station.longitude, station.latitude]);
    var x       = coor[0];
    var y       = coor[1]; 
    var r       = dots_radius(station)*this.last_transform.k;
    var color   = station.flights? "darkred": "#999900";

    this.context.beginPath();
    this.context.moveTo(x, y);
    this.context.arc(x, y, r, 0, 2 * Math.PI);
    this.context.fillStyle = color;
    this.context.fill();
  }
}

function dots_radius(d, s) { var r = Math.sqrt(d.flights/4); return r <= 1? 1: (r > 50? 50: r); };

function is_visible(d, width, height) { return d[0] >= 0 && d[0] <= width && d[1] >= 0 && d[1] <= height; }


FlightsMap.prototype.get_stations_voronoi = function () 
{
  var map                  = this;
  var stations             = this.stations.map(this.projection);
      map.visible_stations = [];
  var visible_stations     = stations.filter(function(d, i) 
  { 
    var visible = is_visible(d, map.width, map.height);
    if (visible) map.visible_stations.push(map.stations[i]);    
    return visible;
  });  
  var poly_voronoi         = this.voronoi.polygons(visible_stations);

  return poly_voronoi;
}


FlightsMap.prototype.draw_voronoi = function () 
{
  var poly_voronoi = this.get_stations_voronoi();

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


FlightsMap.prototype.draw_flights = function()
{
  if (!this.current_stations.length) return;

  var $this    = this;
  var stations = this.current_stations;

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


FlightsMap.prototype.draw = function () 
{
  WorldMap.prototype.draw.call(this);
  
  if (!this.loaded)      return;  
                         this.draw_stations();
  if (this.show_voronoi) this.draw_voronoi();
                         this.draw_flights();    
}


FlightsMap.prototype.voronoi_get_station = function (x, y) 
{
  var poly_voronoi = this.get_stations_voronoi();

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


FlightsMap.prototype.mousemove = function(event) 
{
  if (this.current_stations.length > 1) return;

  var mouse   = d3.mouse(event);
  this.mouse = mouse;
  var station = this.voronoi_get_station(mouse[0], mouse[1]);

  if (!station)                            return;
  if (station == this.current_stations[0]) return;

  this.set_station(station);
  this.draw();  
}


FlightsMap.prototype.set_station = function(station) 
{
  this.current_stations = [station];  
}


FlightsMap.prototype.show_schedules = function () 
{
  this.current_stations = this.stations; 
  this.draw(); 
}


FlightsMap.prototype.reset = function () 
{
  this.current_stations = [];
  this.reset_zoom();

  this.projection.rotate([0, 0, 0]);
  this.projection.scale(this.height/Math.PI);
  this.projection.translate([this.width/2, this.height/2]);
  this.draw();
}

module.exports = FlightsMap;