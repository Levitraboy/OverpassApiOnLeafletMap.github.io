const queryForm = document.querySelector('#queryForm');
const runBtn = document.querySelector('#runBtn');
const downloadBtn = document.querySelector('#downloadBtn');
const layersDOM = document.querySelector('#chosenLayers');

const map = L.map('map').setView([38.963745, 35.243322], 6);

L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxNativeZoom:19,
  maxZoom:20}).addTo(map);

const search = new GeoSearch.GeoSearchControl({
provider: new GeoSearch.OpenStreetMapProvider(),
showMarker: true,
autoClose: true,
});
map.addControl(search);

let overpassLayer = [];
let geojsonLayer = {};
let displayFeatureAs;
let osm_id;

map.on('geosearch/showlocation', function(e) {  
  if (overpassLayer.length > 0) {
    overpassLayer.forEach(val => {map.removeLayer(val);});
    layersDOM.innerHTML = ``;
    overpassLayer = [];
    geojsonLayer = {};
  }
  osm_id = e.location.raw['osm_id'];
  switch(e.location.raw['osm_type']) {
    case "node": 
      displayFeatureAs = `[out:json]; node(${osm_id}); out;`;
      break;
    case "way":
      displayFeatureAs = `[out:json]; way(${osm_id}); out body; node(w); out skel;`;
      break;
    case "relation":
      displayFeatureAs = `[out:json]; rel(${osm_id}); out; way(r); out body; node(w);out skel;`
      break;
  }
  addQuery2Map(displayFeatureAs,'#ff4d4d')
  queryForm.value = `//OSM_ID: ${osm_id}\n[out:json];\n// Write query here..\nout;`
});

runBtn.addEventListener('click', function() {
  var lines = queryForm.value.split("\n");
  var filteredLines = lines.filter(line => !line.startsWith("//"));
  var filteredText = filteredLines.join("\n");
  addQuery2Map(`${filteredText}`, '#3d3d3d')
})

downloadBtn.addEventListener('click', function() {
  download();
})

const addQuery2Map = async (query, layerColor) => {
  const response = await fetch(`https://overpass-api.de/api/interpreter?data=${query}`);
  try {
    const json = await response.json();
    const geojson = osmtogeojson(json);
    if(geojson.features.length > 0) {
      const layerId = prompt('Enter layer name');
      const leafletGeojson = L.geoJSON(geojson, {style: {color: layerColor, opacity: 0.8}})
      overpassLayer.push(leafletGeojson);
      leafletGeojson.addTo(map);

      layersDOM.innerHTML += `<li class="list-group-item">
      <input class="form-check-input me-1" type="checkbox" value="" id=${layerId}>
      <label class="form-check-label" for=${layerId}>${layerId}</label></li>`

      geojsonLayer[`${layerId}`] = JSON.stringify(geojson);
      
      downloadBtn.disabled = false;
      
    } else {alert("Empty JSON file")}
  } catch(err) {
    alert("Bad Request");
  }};

const download = (() => {
  let zip = JSZip();
  [...layersDOM.children].forEach(val => {
    const inputBox = val.children[0]
    if(inputBox.checked){
      zip.file(`${inputBox.id}.geojson`, geojsonLayer[`${inputBox.id}`]);
    }
  })

  if(Object.keys(zip.files).length > 0) {
    zip.generateAsync({type:"blob"})
    .then(function(content) {
        saveAs(content, "geojson.zip");
    });
  }
})
