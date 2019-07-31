// ==UserScript==
// @id iitc-plugin-ingressportalsexporter@RobertoBochet
// @name IITC Plugin: Ingress Portal Export
// @category Information
// @version 0.1
// @namespace http://github.com/RobertoBochet/IITC-Ingress-Portals-Exporter
// @updateURL https://raw.githubusercontent.com/RobertoBochet/IITC-Ingress-Portals-Exporter/master/ingress_export.js
// @downloadURL https://raw.githubusercontent.com/RobertoBochet/IITC-Ingress-Portals-Exporter/master/ingress_export.js
// @description Export portals to a list. It's a fork of https://github.com/Zetaphor/IITC-Ingress-Portal-CSV-Export
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
/*global map:google.maps.Map */

function wrapper() {
    // in case IITC is not available yet, define the base plugin object
    if (typeof window.plugin !== "function") {
        window.plugin = () => {
        };
    }

    // base context for plugin
    window.plugin.portalsExporter = () => {
    };

    let self = window.plugin.portalsExporter;

    self.portalsList = new Map();
    self.isEnabled = false;
    self.isWorking = false;
    self.isCurrentAreaScrapped = false;


    self.updateTotalScrapedCount = () => {
        $('#totalScrapedPortals').text(self.portalsList.size);
    };

    self.drawRectangle = () => {
        let bounds = window.map.getBounds();

        bounds = [
            [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
            [bounds.getNorthEast().lat, bounds.getNorthEast().lng]
        ];

        L.rectangle(bounds, {color: "#00ff11", weight: 1, opacity: 0.9}).addTo(window.map);
    };

    self.isInScreen = (lat, lng) => {
        let bounds = window.map.getBounds();

        let sw = bounds.getSouthWest();
        let ne = bounds.getNorthEast();

        return (lat >= sw.lat) && (lat <= ne.lat) && (lng >= sw.lng) && (lng <= ne.lng);
    };

    self.checkPortals = (portals) => {
        let c = self.portalsList.size;
        // Parse each portal
        for (let guid in portals) {
            c++;
            // Check if the information of portal are available
            if (typeof window.portals[guid] === "undefined") continue;

            // Check if the portal is already scrapped
            if (self.portalsList.has(guid)) continue;

            // Check if the portal is in the screen
            if (!self.isInScreen(portals[guid]._latlng.lat, portals[guid]._latlng.lng)) continue;

            // Add the portal to global list
            self.portalsList.set(guid, {
                name: portals[guid].options.data.title || "untitled portal",
                latitude: portals[guid]._latlng.lat,
                longitude: portals[guid]._latlng.lng,
                image: portals[guid].options.data.image || ""
            });
        }
        console.debug(`Portals Exporter|Added ${self.portalsList.size - c} to portals list`);
    };

    self.getJSON = () => {
        let list = [];

        // Create a list of portals
        self.portalsList.forEach((portal) => {
            list.push(portal);
        });

        // Return the JSON
        return JSON.stringify(list);
    };

    self.getCSV = () => {
        // Create CSV header
        let dump = "name, latitude, longitude, image\n";

        // Create a list of portals
        self.portalsList.forEach((portal) => {
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

    self.setZoomLevel = () => {
        window.map.setZoom(15);
        self.updateZoomStatus();
    };

    self.updateZoomStatus = () => {
        let zoomLevel = window.map.getZoom();

        $('#currentZoomLevel').text(window.map.getZoom());

        if (zoomLevel != 15) {
            self.isCurrentAreaScrapped = false;
            $('#currentZoomLevel').css('color', 'red');

            if (self.isEnabled)
                $('#scraperStatus')
                    .text('Invalid Zoom Level')
                    .css('color', 'yellow');

        } else $('#currentZoomLevel').css('color', 'green');
    };

    self.updateTimerCallback = () => {
        self.updateZoomStatus();

        // The scrapper have to be enabled
        if (!self.isEnabled) return;

        // The zoom have to be right
        if (window.map.getZoom() !== 15) return;

        // Another process hasn't to be running
        if (self.isWorking) return;

        if ($('#innerstatus > span.map > span').html() === 'done') {
            if (!self.isCurrentAreaScrapped) {
                self.isWorking = true;

                $('#scraperStatus').html('Running').css('color', 'green');

                self.checkPortals(window.portals);
                self.updateTotalScrapedCount();

                self.drawRectangle();

                $('#scraperStatus').html('Area Scraped').css('color', 'green');

                self.isCurrentAreaScrapped = true;
                self.isWorking = false;
            }
        } else self.isCurrentAreaScrapped = false;
    };

    self.toggleStatus = () => {
        if (self.isEnabled) {
            self.isEnabled = false;
            $('#scraperStatus').html('Stopped').css('color', 'red');
            $('#startScraper').show();
            $('#stopScraper').hide();
            $('#outputBox').hide();
            $('#totalPortals').hide();
        } else {
            self.isEnabled = true;
            $('#scraperStatus').html('Running').css('color', 'green');
            $('#startScraper').hide();
            $('#stopScraper').show();
            $('#outputBox').show();
            $('#totalPortals').show();
            self.updateTotalScrapedCount();
        }

    };

    // setup function called by IITC
    self.setup = () => {
        // Create the portal exporter toolbox
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

            <div id="outputBox" style="display: none; margin-top: 5px; padding: 5px 0 5px 5px; border-top: 1px solid #20A8B1;">
                <a style="margin: 0 5px 0 5px;" onclick="window.plugin.portalsExporter.copyJSON();" title="Copy JSON">Copy JSON</a>
                <a style="margin: 0 5px 0 5px;" onclick="window.plugin.portalsExporter.copyCSV();" title="Copy CSV">Copy CSV</a>
            </div>
        </div>
        `).insertAfter('#toolbox');

        // Start the timer
        self.updateTimer = window.setInterval(self.updateTimerCallback, 500);

        // Delete this method to ensure setup can't be run again
        delete self.setup;
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
