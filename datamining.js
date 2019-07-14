
function buttonSwitch(i, length){
  if (i <= 0){
    previousButton.style.visibility = "hidden";
  } else if (i >= length -1){
    nextButton.style.visibility = "hidden";
  } else {
    previousButton.style.visibility = "visible";
    nextButton.style.visibility = "visible";
  }
};

function setContent(pointID,locationname, paragraph, status, comment){
  start = paragraph.indexOf(locationname);
  end = start+locationname.length;
  var popupContent = `<b>Ponit ID: `+ pointID + `</b>: ` + locationname + 
  `<br>` + paragraph.substring(0, start) + "<b>" + locationname + "</b>" + paragraph.substring(end, ) + 
  `<br>
  <select id='status'>
  <option value='default' selected='selected' disabled>`+ status + `</option>
  <option value="accept">accept</option>
  <option value="move">move</option>
  <option value="uncertain">uncertain</option>
  <option value="default">default</option>
  <option value="archive">archive</option>
  <option value="remove">remove</option>
  </select><br>
  Comments: <input type='text' id='commentsOnPoint' placeholder="` + comment +`">&nbsp;` ;
  console.log(comment);
  return popupContent;
};

// control the color scheme of the point features based on the status
function styleFunction(feature) {
  var color;
  if (feature.get("status")=="remove"){
    color = [237,248,251];
  } else if (feature.get("status")=="archive"){
    color = [203,201,226];
  } else if (feature.get("status")=="uncertain"){
    color = [158,154,200]; 
  } else if (feature.get("status")=="move"){
    color = [117,107,177];
  } else if (feature.get("status")=="accept"){
    color = [84,39,143];
  } else {
    color = [244, 188, 66];
  };
  var reStyle = new ol.style.Style({
    image: new ol.style.Circle({
         radius: 5,
         fill: new ol.style.Fill({
             color: color
         }),
         stroke: new ol.style.Stroke({
           color:"dark grey",
           width: 0.5
         })
    })
 });
    return reStyle;
};

// Load vector sources from the WFS service
function defineVectorSource(layername, featureStatus){
  var vectorSource = new ol.source.Vector({
    renderMode: 'image', // Vector layers are rendered as images. Better performance. Default is 'vector'.
    format: new ol.format.GeoJSON(),
    url: function(extent) {
      return  'http://152.7.99.155:8080/geoserver/potatoBlight/wfs?service=WFS' +
              '&version=1.0.0&request=GetFeature'+
              '&typeName=potatoBlight:'+ layername +
              // '&CQL_FILTER=id=1'+ // worked
            //   // The following line works in geojson preview
              '&CQL_FILTER=status=%27' + featureStatus + '%27' +
             '&outputFormat=application/json&srsname=EPSG:3857'
            // + '&bbox=' + extent.join(',') + ',EPSG:3857'; // CQL filter and bbox are mutually exclusive. comment this to enable cql filter
    },
    strategy: ol.loadingstrategy.bbox,
  });
  console.log(layername);
  return vectorSource;
};

function defineVectorLayer(layerTitle, layerSource){
  var vectorLayer = new ol.layer.Vector({
    title: layerTitle,
    source: layerSource,
    style: styleFunction,
  });
  return vectorLayer;
};

function getData(multiFeatures, featureIndex, fLength){
  var f = multiFeatures[featureIndex];
  var pointID = f.get('id');
  var locationname = f.get('matchednam');
  var plist = [f.get('paragragh1'), f.get('paragragh2'), f.get('paragragh3'), f.get('paragragh4'), f.get('paragragh5'), f.get('paragragh6'), f.get('paragragh7'), f.get('paragragh8'), f.get('paragragh9')];
  var paragraph = '';
  for (i = 0; i < plist.length; i++) {
    if (null != plist[i]){
      paragraph = paragraph + plist[i]
    };
  }; 
  var status = f.get('status');
  var comment = f.get('comment');

  currentFeature = f;
  currentPointID = pointID;
  console.log(f.getId());

  content.innerHTML = setContent(pointID,locationname, paragraph, status, comment);
  overlay.setPosition(coordinate);
  pointNumber.innerHTML = "( " + (featureIndex + 1) + " of " + fLength + " )";
};

function toggleNav() {
  navSize = document.getElementById("tableSidenav").style.height;
  // If the height of table navigation bar equals to 250 px (the table is opened), close the table; otherwise, open it.
  if (navSize == "250px"){
    console.log("close");
    return closeNav();
  }
  return openNav();
}

function openNav() {
  document.getElementById("tableSidenav").style.height = "250px";
  document.getElementById("map").style.marginBottom = "250px";
}

function closeNav() {
  document.getElementById("tableSidenav").style.height = "0";
  document.getElementById("map").style.marginBottom= "0";
}


var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var pointNumber = document.getElementById('number-of-points');
var nextButton = document.getElementById('next-button');
var previousButton = document.getElementById('previous-button');
var submitButton = document.getElementById('submit');
var zoom2feature = document.getElementById('zoom2feature');

var featureIndex;               
var multiFeatures;
var currentPointID;
var currentFeature;
var currentLayer;

var overlay = new ol.Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

// click close button to close the popup window
closer.onclick = function(){
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

// Need to figure out the syntax of view.fit
zoom2feature.onclick = function(){
  map.getView().fit(layer45.getSource().getExtent(), [50, 50]);
};

// submit status and comments to the postGIS database
submitButton.onclick = function (){
  var updatedStatus = document.getElementById('status').value;
  var updatedComment = document.getElementById('commentsOnPoint').value;
  currentFeature.setProperties({'status': updatedStatus, 'comment': updatedComment});
  var newp = currentFeature.getProperties();
  delete newp.bbox;
  var newID = currentFeature.getId();

  var clone = new ol.Feature(newp);
  clone.setId(newID);
  clone.setGeometryName('geom');
  transactWFS('update', clone);
  overlay.setPosition(undefined);
  closer.blur();
};

// click next button to go to the next point
nextButton.onclick = function(){
  featureIndex = featureIndex + 1;
  var fLength = multiFeatures.length;
  buttonSwitch(featureIndex, fLength);
  getData(multiFeatures, featureIndex, fLength);
};

// // click previous button to go back to the previous point
previousButton.onclick = function(){
  featureIndex = featureIndex - 1;
  var fLength = multiFeatures.length;
  buttonSwitch(featureIndex,fLength);
  getData(multiFeatures, featureIndex, fLength);
};

var source43 = defineVectorSource('a_43disease_extend0');
// var source43_old = defineVectorSource('a_43disease_old0');
var source44 = defineVectorSource('a_44disease_extend0');
var source44_old = defineVectorSource('a_44disease_old0', 'remove');
var source45 = defineVectorSource('a_45disease_extend0');

var layer43 = defineVectorLayer('1843disease', source43);
// var layer43_old = defineVectorLayer('1843disease old', source43_old);
var layer44 = defineVectorLayer('1844disease', source44);
var layer44_old = defineVectorLayer('1844disease old', source44_old);
var layer45 = defineVectorLayer('1845disease', source45);

var formatWFS = new ol.format.WFS();

// function defineGML(currentLayer){
var formatGML = new ol.format.GML({
  featureNS: 'http://potatoBlight',
  featureType: 'a_45disease_extend0',
  //  featureType: currentLayer,
  srsName: 'EPSG:3857'
});
  // return formatGML;
// };

var xs = new XMLSerializer();

// Enable transactional WFS
var transactWFS = function (mode, f) {
  var node;
  // var GML = defineGML;
  switch (mode) {
      case 'insert':
          node = formatWFS.writeTransaction([f], null, null, formatGML);
          break;
      case 'update':
          node = formatWFS.writeTransaction(null, [f], null, formatGML);
          break;
      case 'delete':
          node = formatWFS.writeTransaction(null, null, [f], formatGML);
          break;
  }
  var payload = xs.serializeToString(node);
  $.ajax('http://152.7.99.155:8080/geoserver/potatoBlight/wfs', {
      type: 'POST',
      dataType: 'xml',
      processData: false,
      contentType: 'text/xml',
      data: payload
  }).done(function() {
    source45.clear();
  });
};

// var interaction;

// Define pointer move interaction on the layers. The sytle is default.
var interactionSelectPointerMove = new ol.interaction.Select({
  condition: ol.events.condition.pointerMove
});

var interactionSelect = new ol.interaction.Select({
  // style: new ol.style.Style({
  //     stroke: new ol.style.Stroke({
  //         color: '#B423C4'
  //     })
  // }),
  // condition: ol.events.condition.click
});

// var interactionSnap = new ol.interaction.Snap({
//   source: layer45.getSource()
// });

var mapLayers = [
  new ol.layer.Group({
    title: "Base maps", 
    layers: [
      new ol.layer.Tile({
        title: "Open Street Map",
        type: "base",
        visible: true,
        source: new ol.source.OSM()
      }),

    ]
  }),
  new ol.layer.Group({
    title: "Layers",
    layers: [
      // layer45,
      layer44_old,
      // layer44,
      // layer43_old,
      // layer43,
    ]
  })
];


var map = new ol.Map({
  target: 'map',
  loadTilesWhileAnimating: true,
  loadTilesWhileInteracting: true,
	controls:[
		new ol.control.OverviewMap(),
		new ol.control.Zoom(),
		new ol.control.ScaleLine(),
  ],
  interactions: [
    interactionSelectPointerMove,
    new ol.interaction.MouseWheelZoom(),
    new ol.interaction.DragPan(),
    interactionSelect,
  ],

  layers: mapLayers,
  overlays:[overlay],
  view: new ol.View({
    center: ol.proj.fromLonLat([-25.922388,30.193475]),
    zoom: 3   
    }),
});

// Add sidebar
// var sidebar = new ol.control.Sidebar({ element: 'sidebar', position: 'right'});

// var toc = document.getElementById('layers');
// ol.control.LayerSwitcher.renderPanel(map, toc);
// map.addControl(sidebar);

var layerSwitcher = new ol.control.LayerSwitcher({
  tipLabel: 'Légende'
});
map.addControl(layerSwitcher);


map.on('singleclick', function(evt){
  var featureExists = map.hasFeatureAtPixel(evt.pixel);

  if (featureExists){
    coordinate = evt.coordinate;
    multiFeatures = map.getFeaturesAtPixel(evt.pixel);
    featureIndex = 0;
    var fLength = multiFeatures.length;
    if (fLength > 1){
      buttonSwitch(featureIndex, fLength);
      nextButton.style.visibility = "visible";
    } else {
      nextButton.style.visibility = "hidden";
      previousButton.style.visibility = 'hidden';
    };

    getData(multiFeatures, featureIndex, fLength);
  } else {
    overlay.setPosition(undefined);
  }
});

// If there is any feature at the event pixel (where the mouse points at), the pointer will change to the 'hand' symbol
map.on('pointermove', function(e) {
  if (e.dragging) {
      return;
  }
  var pixel = map.getEventPixel(e.originalEvent);
  var hit = map.hasFeatureAtPixel(pixel);

  e.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});

// Create attribute table using Jquery library DataTable
// Here I use the newer 'DataTable' function rather than the older one 'dataTable'
var table = $('#attributeTb').DataTable({
  responsive: 'true',
  "dom": '<"top"i>frt<"bottom"lp>',
  "scrollX": true,
  "ajax":{
    // Delete the limitation: maxFeatures=50
    // Solved from Stackoverflow questions no.48147970
    // "url": "http://152.7.99.155:8080/geoserver/potatoBlight/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=potatoBlight:a_45disease_extend0&outputFormat=application%2Fjson",
    "url": 'http://152.7.99.155:8080/geoserver/potatoBlight/wfs?service=WFS'+ 
    '&version=1.0.0&request=GetFeature'+
    '&typeName=potatoBlight:'+ 'a_44disease_old0' +
    // '&CQL_FILTER=status=%27accept%27' +
    '&CQL_FILTER=id=1' +
    '&outputFormat=application/json',
    "dataSrc": "features"
  },
  "columns": [
    { "title": "ID",
      data: "properties.id",
      "class": "center"},
    { "title": "Place_Name",
      data: "properties.matchednam",
      "class": "center"},
    { "title": "Status",
      data: "properties.status",
      "class": "center"},
    { "title": "Comment",
      data: "properties.comment",
      "class": "center"},
    { "title": "Paragraph",
      data: "properties",
      render: function(data, type, row){
        return data.paragragh1 + data.paragragh2 + data.paragragh3 + data.paragragh4},
      "class": "center"},
    ]
});

// Select (highlight) the point feature from the attribute table
var pStyle = new ol.style.Style({
  image: new ol.style.Circle({
    radius: 15,
    fill: new ol.style.Fill({
        color: "yellow"
    }),
    stroke: new ol.style.Stroke({
      color:"dark grey",
      width: 0.5
    })
})
});

function highlightFeature(feat){
  interactionSelect.getFeatures().push(feat);
  interactionSelect.dispatchEvent({
     type: 'select',
     selected: [feat],
     deselected: []
  });
};

// Select the row in the attribute table will also highlight the point on the map.
// It doesn't enable multiple selection.
$('#attributeTb tbody').on('click', 'tr', function () {
  interactionSelect.getFeatures().clear(); // Clear the selected features
  // $(this).toggleClass('selected');
  if ($(this).hasClass('selected')) { // If the row is selected,
    $(this).removeClass('selected'); // deselect it
  } else {
    table.$('tr.selected').removeClass('selected'); // Remove all the selected rows in the table
    $(this).addClass('selected'); // Select the row
    var long = table.row(this).data().properties["longitude"];
    var lat = table.row(this).data().properties["latitude"];
    console.log(table.row(this).data().id, lat, long)
    
    var selectedFeatures = new ol.Feature({
      geometry: new ol.geom.Point(
        ol.proj.fromLonLat([long, lat])
        // The following line worked as well, whcih can be used when the coordinate system of data source
        // is different from the openLayers map
        // ol.proj.transform([long, lat], 'EPSG:4326', 'EPSG:3857')
      )
    });
    var selectedSource = new ol.source.Vector({
      features: [selectedFeatures] // Features should be stored in an array
    });
    var seletedLayer = new ol.layer.Vector({
      source: selectedSource,
      style: pStyle
    });
    highlightFeature(selectedFeatures)
  }
});


// $('#attributeTb tbody').on('click', 'tr', function () {
//   // interactionSelect.getFeatures().clear();
//   $(this).toggleClass('selected');
//   // if (table.rows('.selected')) {
//   if ($(this).hasClass('selected')) {
//     // $(this).removeClass('selected');
//     console.log('selected it.')
//     console.log(table.row(this).data().id);
//     // console.log(table.row(this).data());
//     var long = table.row(this).data().properties["longitude"];
//     var lat = table.row(this).data().properties["latitude"];
//     console.log(lat, long)
    
//     var selectedFeatures = new ol.Feature({
//       geometry: new ol.geom.Point(
//         ol.proj.fromLonLat([long, lat])
//         // The following line worked as well, whcih can be used when the coordinate system of data source
//         // is different from the openLayers map
//         // ol.proj.transform([long, lat], 'EPSG:4326', 'EPSG:3857')
//       )
//     });
//     var selectedSource = new ol.source.Vector({
//       features: [selectedFeatures] // Features should be stored in an array
//     });
//     var seletedLayer = new ol.layer.Vector({
//       source: selectedSource,
//       style: pStyle
//     });
//     // map.addLayer(seletedLayer);
//     // console.log(map.getLayers());
//     // highlightFeature(selectedFeatures)
//     interactionSelect.getFeatures().push(selectedFeatures);
//     // interactionSelect.dispatchEvent({
//     //   type: 'select',
//     //   selected: [selectedFeatures],
//     //   deselected: []
//     // });
//   } else {
//     console.log('selected, so we unselected it');
//     interactionSelect.getFeatures().clear();
//     // table.$('tr.selected').removeClass('selected');
//     // $(this).addClass('selected');
//   }
// });
