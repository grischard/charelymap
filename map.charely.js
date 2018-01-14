var charely = {};
charely.layers = {};

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

charely.init = function() {

    moment.locale('fr-ch')

    // query string: ?nocache=yes to load directly from overpass

    var nocache = getParameterByName('nocache');
    // console.log(nocache)

    if (nocache) {
        var linesUrl = 'https://overpass-api.de/api/interpreter?data=[out:json];area(3602171347)->.lux;(relation["historic"="railway"](area.lux);node(r)->.x;way(r);node(w););out body;';
    } else { // nocache isn't defined
        var linesUrl = 'charely.json';
    }
    // console.log(linesUrl)

    // init map
    charely.map = POImap.init();
    // load route relations
    POImap.loadAndParseOverpassJSON(linesUrl, null, null, charely.handleRelation, null);
};

charely.handleRelation = function(p) {
    p.members.filter(function(mem) {
        // console.log(mem.obj);
        return mem.obj;
    }).map(function(mem) {
        charely.addLine(p.tags.name, {
            type: 'Feature',
            geometry: mem.obj.geometry,
            id: mem.obj.id,
            tags: mem.obj.tags,
            reltags: p.tags,
            // angle: stopAngles[mem.ref]
        });
    });
};

charely.addLine = function(linename, geojson) {
    var layer = L.geoJson(geojson, {
        style: function(p) {
            // Adapt style/color
            // p.reltags
            return {
                opacity: 1,
                color: (p.reltags && p.reltags['historic:gauge'] && p.reltags['historic:gauge'] == '1435' ? '#59191F' : '#A61B4A') ,
                weight: (p.reltags && p.reltags['historic:gauge'] && p.reltags['historic:gauge'] == '1435' ? 8 : 6)

            };
        },
        // pointToLayer: charely.addStop,
        onEachFeature: charely.bindPopup
    }).addTo(charely.layers[linename] || charely.map);
    if (!charely.layers[linename]) {
        charely.layers[linename] = layer;
        charely.map.getControl().addOverlay(layer, linename.replace(/Ancienne ligne /, ''));
    }
};


charely.bindPopup = function(p, l) {
    // TODO Adapt popup
    // name, name:lb, historic:start_date and end_date, website, wikipedia
    linename = (p.reltags && p.reltags.name ? p.reltags.name : 'Ligne inconnue');
    linenamelb = (p.reltags && p.reltags['name:lb'] ? p.reltags['name:lb'] : '');
    segname = (p.tags && p.tags.name ? p.tags.name : '');
    segnamelb = (p.tags && p.tags['name:lb'] ? p.tags['name:lb'] : '');
    //  if linename == segname hide segname
    if (segname && linename && linename.toLowerCase().replace(/\s+/g, '') == segname.toLowerCase().replace(/\s+/g, '')) {
        segname = ''
        if(segnamelb){
            segnamelb = ''
        }
    }
    start_date = (p.reltags && p.reltags['historic:start_date'] ? new moment(p.reltags['historic:start_date'], "YYYY-MM-DD").format('LL') : '?');
    end_date = (p.reltags && p.reltags['historic:end_date'] ? new moment(p.reltags['historic:end_date'], "YYYY-MM-DD").format('LL') : '?');
    gauge = (p.tags && p.tags['historic:gauge'] ? p.tags['historic:gauge'] : null);

    website = (p.reltags && p.reltags.website ? p.reltags.website : 'https://rail.lu');
    wiki = (p.reltags && p.reltags.wikipedia ? p.reltags.wikipedia : 'lb:Lëscht vun de lëtzebuergeschen Eisebunnsstrecken');
    wikiurl = 'https://' + wiki.substr(0, wiki.indexOf(':')) + '.wikipedia.org/wiki/' + wiki.substr(wiki.indexOf(':') + 1);

    l.bindPopup(
        '<div><span style="font-weight: bold; font-size: 115%;">' + linename.replace(/Ancienne ligne/, 'Ligne')
        + (linenamelb ? ' <span style="font-style: italic;">(' + linenamelb + ')</span>' : '')
        + '</span></div>'

        + (gauge ? ' <div><span style="font-style: italic;">🛤 ' + gauge + ' mm</span>' : '')

        + '<div><span style="font-size: 115%;">' + start_date + ' - ' + end_date + '</span></div>'

        + '<div><span style="font-weight: bold;">' + segname
        + (segnamelb ? ' <span style="font-style: italic;">(' + segnamelb + ')</span>' : '')
        + '</span></div>'

        + '<div><a href="' + wikiurl + '" target="_blank">🚂 sur Wikipédia</a><br/>'
        + '<a href="' + website + '" target="_blank">🚂 sur le web</a></div>'
    )
};
