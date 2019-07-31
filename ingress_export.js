// ==UserScript==
// @id iitc-plugin-ingressportalexport@RobertoBochet
// @name IITC Plugin: Ingress Portal Export
// @category Information
// @version 0.0.5
// @namespace http://github.com/RobertoBochet/IITC-Ingress-Portal-Export
// @updateURL https://raw.githubusercontent.com/RobertoBochet/IITC-Ingress-Portal-Export/master/ingress_export.js
// @downloadURL https://raw.githubusercontent.com/RobertoBochet/IITC-Ingress-Portal-Export/master/ingress_export.js
// @description Exports portals to a list. It's a fork of https://github.com/Zetaphor/IITC-Ingress-Portal-CSV-Export
// @include https://www.ingress.com/intel*
// @include http://www.ingress.com/intel*
// @include https://ingress.com/intel*
// @include http://ingress.com/intel*
// @include https://intel.ingress.com/intel*
// @include http://intel.ingress.com/intel*
// @match https://www.ingress.com/intel*
// @match http://www.ingress.com/intel*
// @match https://ingress.com/intel*
// @match http://ingress.com/intel*
// @grant none
// ==/UserScript==
/*global $:false */
/*global map:false */

/*global L:false */
function wrapper() {
    // in case IITC is not available yet, define the base plugin object
    if (typeof window.plugin !== "function") {
        window.plugin = function () {
        };
    }

    // base context for plugin
    window.plugin.portalsExporter = function () {
    };
    var self = window.plugin.portalsExporter;

    window.portals_list = new Map();
    window.portal_scraper_enabled = false;
    window.current_area_scraped = false;


    self.updateTotalScrapedCount = function () {
        $('#totalScrapedPortals').text(window.portals_list.size);
    };

    self.drawRectangle = function () {
        var bounds = window.map.getBounds();
        var bounds = [[bounds._southWest.lat, bounds._southWest.lng], [bounds._northEast.lat, bounds._northEast.lng]];
        L.rectangle(bounds, {color: "#00ff11", weight: 1, opacity: 0.9}).addTo(window.map);
    };


    self.isInScreen = (lat, lng) => {
        let bounds = window.map.getBounds();

        let sw = bounds.getSouthWest();
        let ne = bounds.getNorthEast();

        return (lat >= sw.lat) && (lat <= ne.lat) && (lng >= sw.lng) && (lng <= ne.lng);
    };

    self.checkPortals = (portals) => {
        let c = window.portals_list.size;
        // Parse each portal
        for (let guid in portals) {
            c++;
            // Check if the information of portal are available
            if (typeof window.portals[guid] === "undefined") continue;

            // Check if the portal is already scrapped
            if (window.portals_list.has(guid)) continue;

            // Check if the portal is in the screen
            if (!self.isInScreen(portals[guid]._latlng.lat, portals[guid]._latlng.lng)) continue;

            // Add the portal to global list
            window.portals_list.set(guid, {
                name: portals[guid].options.data.title || "untitled portal",
                latitude: portals[guid]._latlng.lat,
                longitude: portals[guid]._latlng.lng,
                image: portals[guid].options.data.image || ""
            });
        }
        console.debug(`Portals Exporter|Added ${window.portals_list.size - c} to portals list`);
    };

    self.getJSON = () => {
        let list = [];

        // Create a list of portals
        window.portals_list.forEach((portal) => {
            list.push(portal);
        });

        // Return the JSON
        return JSON.stringify(list);
    };

    self.getCSV = () => {
        // Create CSV header
        let dump = "name, latitude, longitude, image\n";

        // Create a list of portals
        window.portals_list.forEach((portal) => {
            dump += `"${portal.name.replace(/"/g, '\\\"')}",`;
            dump += `${portal.latitude},`;
            dump += `${portal.longitude},`;
            dump += `"${portal.image.replace(/"/g, '\\\"')}"\n`;
        });

        // Return the csv
        return dump
    };

    self.copyJSON = () => {
        // Copy the JSON in the user's clipboard
        navigator.clipboard.writeText(self.getJSON()).then(null);
    };

    self.copyCSV = () => {
        // Copy the CSV in the user's clipboard
        navigator.clipboard.writeText(self.getCSV()).then(null);
    };


    self.setZoomLevel = function () {
        window.map.setZoom(15);
        $('#currentZoomLevel').html('15');
        self.updateZoomStatus();
    };

    self.updateZoomStatus = function () {
        var zoomLevel = window.map.getZoom();
        $('#currentZoomLevel').html(window.map.getZoom());
        if (zoomLevel != 15) {
            window.current_area_scraped = false;
            $('#currentZoomLevel').css('color', 'red');
            if (window.portal_scraper_enabled) $('#scraperStatus').html('Invalid Zoom Level').css('color', 'yellow');
        } else $('#currentZoomLevel').css('color', 'green');
    };

    self.updateTimer = function () {
        self.updateZoomStatus();
        if (window.portal_scraper_enabled) {
            if (window.map.getZoom() == 15) {
                if ($('#innerstatus > span.map > span').html() === 'done') {
                    if (!window.current_area_scraped) {
                        self.checkPortals(window.portals);
                        window.current_area_scraped = true;
                        $('#scraperStatus').html('Running').css('color', 'green');
                        self.drawRectangle();
                    } else {
                        $('#scraperStatus').html('Area Scraped').css('color', 'green');
                    }
                } else {
                    current_area_scraped = false;
                    $('#scraperStatus').html('Waiting For Map Data').css('color', 'yellow');
                }
            }
        }
    };

    self.panMap = function () {
        window.map.getBounds();
        window.map.panTo({lat: 40.974379, lng: -85.624982});
    };

    self.toggleStatus = function () {
        if (window.portal_scraper_enabled) {
            window.portal_scraper_enabled = false;
            $('#scraperStatus').html('Stopped').css('color', 'red');
            $('#startScraper').show();
            $('#stopScraper').hide();
            $('#csvControlsBox').hide();
            $('#totalPortals').hide();
        } else {
            window.portal_scraper_enabled = true;
            $('#scraperStatus').html('Running').css('color', 'green');
            $('#startScraper').hide();
            $('#stopScraper').show();
            $('#csvControlsBox').show();
            $('#totalPortals').show();
            self.updateTotalScrapedCount();
        }

    };

    // setup function called by IITC
    self.setup = function init() {
        // add controls to toolbox
        var link = $("");
        $("#toolbox").append(link);

        $(`
        <div id="portalExporterToolbox" style="position: relative;">
            <p style="margin: 5px 0 5px 0; text-align: center; font-weight: bold;">Portal Exporter</p>
            <a id="startScraper" style="position: absolute; top: 0; left: 0; margin: 0 5px 0 5px;" onclick="window.plugin.portalsExporter.toggleStatus();" title="Start the portal data scraper">Start</a>
            <a id="stopScraper" style="position: absolute; top: 0; left: 0; display: none; margin: 0 5px 0 5px;" onclick="window.plugin.portalsExporter.toggleStatus();" title="Stop the portal data scraper">Stop</a>

            <div class="zoomControlsBox" style="margin-top: 5px; padding: 5px 0 5px 5px;">
                Current Zoom Level: <span id="currentZoomLevel">0</span>
                <a style="margin: 0 5px 0 5px;" onclick="window.plugin.portalsExporter.setZoomLevel();" title="Set zoom level to enable portal data download.">Set Zoom Level</a>
            </div>

            <p style="margin:0 0 0 5px;">Scraper Status: <span style="color: red;" id="scraperStatus">Stopped</span></p>
            <p id="totalPortals" style="display: none; margin:0 0 0 5px;">Total Portals Scraped: <span id="totalScrapedPortals">0</span></p>

            <div id="csvControlsBox" style="display: none; margin-top: 5px; padding: 5px 0 5px 5px; border-top: 1px solid #20A8B1;">
                <a style="margin: 0 5px 0 5px;" onclick="window.plugin.portalsExporter.copyJSON();" title="Copy JSON">Copy JSON</a>
                <a style="margin: 0 5px 0 5px;" onclick="window.plugin.portalsExporter.copyCSV();" title="Copy CSV">Copy CSV</a>
            </div>
        </div>
        `).insertAfter('#toolbox');

        window.csvUpdateTimer = window.setInterval(self.updateTimer, 500);

        // delete self to ensure init can't be run again
        delete self.init;
    };
    // IITC plugin setup
    if (window.iitcLoaded && typeof self.setup === "function") {
        self.setup();
    } else if (window.bootPlugins) {
        window.bootPlugins.push(self.setup);
    } else {
        window.bootPlugins = [self.setup];
    }
}

// inject plugin into page
var script = document.createElement("script");
script.appendChild(document.createTextNode("(" + wrapper + ")();"));
(document.body || document.head || document.documentElement)
    .appendChild(script);
