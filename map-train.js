var POImap = {};

POImap.init = function() {
    var attr_osm = 'Map data &copy; <a href="//openstreetmap.org/">OpenStreetMap</a> contributors',
        attr_overpass = 'POI via <a href="//overpass-api.de/">Overpass API</a>';

    var osm = new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: [attr_osm, attr_overpass].join(' &mdash; ')
    }),
        pioneer = new L.tileLayer('https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=38175149cbe84e19b4d6bc30da71082d', {
            attribution: ['Pioneer Map &copy; <a href="http://www.thunderforest.com/maps/pioneer/">Thunderforest</a>', attr_osm, attr_overpass].join(' &mdash; '),
            maxzoom: 22
        }),

        ortho2010 = new L.tileLayer('https://wmts3.geoportail.lu/opendata/wmts/ortho_2010/GLOBAL_WEBMERCATOR_4_V3/{z}/{x}/{y}.jpeg', {
            // opacity: 0.6,
            attribution: ['Images CC-0 <a href="https://geoportail.lu/" target="_blank">Administration du Cadastre et de la Topographie</a>', attr_osm, attr_overpass].join(' &mdash; '),
            maxzoom: 22,
            detectRetina: true
        }),

        hansen = new L.tileLayer('https://wmts3.geoportail.lu/opendata/wmts/TOPO_CARTESHISTO_1927_CAHANSEN/GLOBAL_WEBMERCATOR_4_V3/{z}/{x}/{y}.png', {
            attribution: ['Carte Hansen CC-0 <a href="https://geoportail.lu/" target="_blank">Administration du Cadastre et de la Topographie</a>', attr_osm, attr_overpass].join(' &mdash; '),
            maxzoom: 17,
            detectRetina: true
        }),

        topo54 = new L.tileLayer('https://wmts3.geoportail.lu/opendata/wmts/TOPO_CARTESHISTO_1954/GLOBAL_WEBMERCATOR_4_V3/{z}/{x}/{y}.png', {
            attribution: ['Carte topographique 1954 CC-0 <a href="https://geoportail.lu/" target="_blank">Administration du Cadastre et de la Topographie</a>', attr_osm, attr_overpass].join(' &mdash; '),
            maxzoom: 17,
            detectRetina: true
        }),

        transport = new L.TileLayer('//{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png', {
            attribution: ['<a href="http://blog.gravitystorm.co.uk/2011/04/11/transport-map/">Gravitystorm Transport Map</a>', attr_osm, attr_overpass].join(', ')
        });


    map = new L.Map('map', {
        center: new L.LatLng(49.8, 6.14),
        zoom: 9,
        layers: pioneer,
        'zoomControl': false,
    })

    map.getControl = function() {
        var ctrl = new L.Control.Layers({
            'Transport (OpenStreetMap)': transport,
            'Pioneer (OpenStreetMap)': pioneer,
            'Hansen 1927': hansen,
            'Carte topographique de 1954': topo54,
            'Ortho 2010': ortho2010,
        },{},{position: 'topright'});
        return function() {
            return ctrl;
        };
    }();
    map.addControl(map.getControl());
    map.addControl(L.control.zoom({position: 'topleft'}));

    var path_style = L.Path.prototype._updateStyle;
    L.Path.prototype._updateStyle = function() {
        path_style.apply(this);
        for (var k in this.options.svg) {
            this._path.setAttribute(k, this.options.svg[k]);
        }
    };

    POImap.map = map;

    var sidebar = L.control.sidebar('sidebar', {position: 'right'}).addTo(map);
    sidebar.open('readme');
    return map;
};

POImap.loadAndParseOverpassJSON = function(overpassQueryUrl, callbackNode, callbackWay, callbackRelation, callbackSuccess) {
    $.getJSON(overpassQueryUrl, function(json) {
        POImap.parseOverpassJSON(json, callbackNode, callbackWay, callbackRelation);
        if (typeof callbackSuccess === 'function') callbackSuccess();
    });
};

POImap.parseOverpassJSON = function(overpassJSON, callbackNode, callbackWay, callbackRelation) {
    var nodes = {}, ways = {};
    for (var i = 0; i < overpassJSON.elements.length; i++) {
        var p = overpassJSON.elements[i];
        switch (p.type) {
            case 'node':
                p.coordinates = [p.lon, p.lat];
                p.geometry = {
                    type: 'Point',
                    coordinates: p.coordinates
                };
                nodes[p.id] = p;
                // p has type=node, id, lat, lon, tags={k:v}, coordinates=[lon,lat], geometry
                if (typeof callbackNode === 'function') callbackNode(p);
                break;
            case 'way':
                p.coordinates = p.nodes.map(function(id) {
                    return nodes[id].coordinates;
                });
                p.geometry = {
                    type: 'LineString',
                    coordinates: p.coordinates
                };
                ways[p.id] = p;
                // p has type=way, id, tags={k:v}, nodes=[id], coordinates=[[lon,lat]], geometry
                if (typeof callbackWay === 'function') callbackWay(p);
                break;
            case 'relation':
                if (!p.members) {
                    console.log('Empty relation', p);
                    break;
                }
                p.members.map(function(mem) {
                    mem.obj = (mem.type == 'way' ? ways : nodes)[mem.ref];
                });
                // p has type=relaton, id, tags={k:v}, members=[{role, obj}]
                if (typeof callbackRelation === 'function') callbackRelation(p);
                break;
        }
    }
};
