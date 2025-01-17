# IITC Ingress Portals Exporter
This is a plugin for the [Ingress Total Conversion](http://github.com/iitc-project/ingress-intel-total-conversion) userscript. It allows you to parse the name, image, and coordinates for all Ingress portals within the viewport. This portal data can then be exported as JSON or CSV.

### Usage
After installing the userscript, navigate to the [Ingress intel page](https://www.ingress.com/intel).

You will see a new toolbox added to the IITC sidebar. Once your zoom level is set to 15 (displayed in the plugin) you can start the scraper. The zoom restriction is required as lower zoom levels don't return the full set of data for portals, only their coordinates.

The scraper will not download any portal data until the current map view has finished loading.

Once map data has loaded and the viewport has been scraped, a green rectangle is drawn over the viewport boundaries on the map. This makes it easier to pan around and capture large areas (due to the zoom restriction) while keeping track of what has already been captured.

### Contributing
Pull requests and issues are welcome.

#### Credit
This project started as a fork of the [IITC-Ingress-Portal-CSV-Export](https://github.com/Zetaphor/IITC-Ingress-Portal-CSV-Export) plugin by [Zetaphor](https://github.com/Zetaphor).

### Disclaimer
I am in no way affiliated with Niantic, Nintendo, or GameFreak.
