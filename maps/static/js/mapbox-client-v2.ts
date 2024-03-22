import {Map, NavigationControl} from 'maplibre-gl';

// Declair our global map variable
declare global {
    interface Window {
        map: DjangoMapboxClient;
    }
}

// Define the structure of your JSON objects as GeoJSON

// Feature
interface Feature {
    type: string;
    geometry: {
        type: string;
        coordinates: number[];
    };
    properties: {
        [key: string]: string;
    };
}

// GeoJSON

type GeoJSON = {
    type: string;
    features: Feature[];
};

// Map of GeoJSON objects we use to keep layers in sync with the map
interface GeoJSONMap {
    [key: string]: GeoJSON; // Define the structure of your JSON objects as GeoJSON
}

// Icons
interface Icon {
    name: string;
    url: string;
}

// Queue Operation
interface QueueOperation {
    type: "add_layer" | "remove_layer" | "add_geojson" | "clear_layer" | "set_visibility" | "add_event" | "resize";
    layer_name?: string; // This makes layer_name optional
    data?: GeoJSON;
    url?: string;
    values?: any;
    hook?: Function;
    toggle?: boolean;
}

// Client Options used to initialize the map
interface ClientOptions {
    minZoom: number;
    maxZoom: number;
    zoom: number;
    padding: number;
    center: [number, number];
    style: string;
    controls: boolean;
    debug: boolean;
    icons: Icon[];
    json_url: string;
    fit: boolean;
}

// Event Options used to add events to the map
interface eventOptions {
    hook?: Function;
    layer?: string;
    clear?: boolean;
    add_point?: boolean;
}

// Mapbox Client
class DjangoMapboxClient {
    map: Map;
    queue: QueueOperation[] = [];
    loaded: boolean = false;
    currentLocation: [number, number] = null;
    debug: boolean = false;
    canvas: HTMLElement;

    options: ClientOptions;

    geojson: GeoJSONMap = {};
    events: eventOptions[] = [];

    constructor() {

    }

    init(options: ClientOptions) {
        this.options = options;
        this.map = new Map({
            container: 'map',
            style: this.options.style,
            center: this.options.center,
            zoom: this.options.zoom,
            minZoom: this.options.minZoom,
            maxZoom: this.options.maxZoom
        });

        if (this.options.controls === true) {
            this.map.addControl(new NavigationControl());
        }

        this.canvas = this.map.getCanvasContainer();

        if (options.debug && options.debug === true) {
            console.log('*********************** MAP DEBUG ***********************')
            console.log('Mapbox Client: ', options);
            this.map.showCollisionBoxes = true;
            this.map.showTileBoundaries = true;
            this.map.on('click', () => {
                // Print the current map center and zoom
                console.log('Center:', this.map.getCenter());
                console.log('Zoom:', this.map.getZoom());
            });
        }

        let self = this;

        this.map.on('load', function () {
            console.log('Map Loaded');
            self.loaded = true;
            self.loadIcons(self.options.icons);
            self.enableLocation();
            self.processQueue();
            self.reload_data();
        });
    }

    loadIcons(icons: Icon[]) {
        let self = this;
        icons.forEach((icon) => {
            // Make a random uuid to use as the image name
            const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            console.log('Loading Icon:', icon);
            self.map.loadImage(icon.url+"?cacheblock="+uuid).then(response => {
                console.log(response);

                // Add the image to the map
                self.map.addImage(icon.name, response.data);
            });
        });
    }

    enableLocation() {
    }

    reload_data() {
        if (this.options.json_url !== 'None') {
            fetch(this.options.json_url)
                .then(response => response.json())
                .then(data => {
                    this.addGeojson(data);
                })
                .catch(error => console.error(error));
        }
    }

    addGeojson(data: GeoJSON, layer_name: string = 'data') {
        this.addQueueOperation({type: 'add_geojson', data: data, layer_name: layer_name});
    }

    addQueueOperation(operation: QueueOperation) {
        this.queue.push(operation);
        this.processQueue();
    }

    processQueue(): void {
        if (this.loaded === true && this.queue.length > 0) {
            console.log(`Processing Queue ${this.queue.length} items left ${this.loaded}`);
            let operation = this.queue.shift();
            switch (operation.type) {
                case 'add_geojson':
                    this.map.getSource(operation.layer_name).setData(operation.data);
                    this.geojson[operation.layer_name] = operation.data;
                    if (this.geojson[operation.layer_name].features.length > 0) {
                        if(this.options.fit === true) {
                            //const bbox = turf.bbox(window.geojson[queue[layer]]);
                            //this.map.fitBounds(bbox, {padding: this.options.padding, maxZoom: this.options.maxZoom});
                        }
                        if (this.options.location === 'True' && this.currentLocation) {
                            this.checkNearPoints(this.currentLocation[0], this.currentLocation[1]);
                        }
                    }
                    if(this.options.selected!=='False') {
                        this.map.setSelected(params.selected,14);
                    }
                    break;
                case 'clear_layer':
                    this.map.clearLayer(operation.layer_name);
                    break;
                case 'add_event':
                    const callback = (event: Event) => {
                        if (operation.add_point === true) {
                            this.geojson[operation.layer_name].features.push({
                                "type": "Feature",
                                "geometry": {"coordinates": [event.lngLat.lng, event.lngLat.lat], "type": "Point"},
                                "properties": {"icon": "point"}
                            });
                            this.map.getSource(operation.layer_name).setData(this.geojson[operation.layer_name]);
                        }
                        operation.hook([event.lngLat.lng, event.lngLat.lat], event);
                    }

                    if (operation.toggle === true) {
                        for (let i in this.events) {
                            this.map.off('click', this.events[i].hook);
                        }
                        this.events = [];
                    }
                    this.map.on('click', operation.hook);
                    this.events.push(operation);
                    break;
                case 'resize':
                    this.map.resize();
                    break;
                default:
                    break;
            }
            this.processQueue()
        }
    }

    setLayerVisibility(layer_name: string, visibility: string) {
        this.addQueueOperation({type: 'set_visibility', layer_name: layer_name, values: {visibility: visibility}});
    }


    clickEvent(eventOption: eventOptions): void {
        const {
            hook = null,
            layer = 'data',
            clear = true
        } = eventOption;
        this.addQueueOperation({
            type: 'add_event',
            layer_name: eventOption.layer,
            hook: eventOption.hook,
            toggle: eventOption.clear
        });
    }

    resize() {
        this.addQueueOperation({type: 'resize'});
    }
}

export default {DjangoMapboxClient};
let mapClient = new DjangoMapboxClient();

window.map = mapClient;
// DomContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Get the map element and start the mapbox client
    let mapElement = document.getElementById('map');
    // get the json in data-params
    let params_string: string = mapElement.getAttribute('data-params');
    // reformat to json by replacing single quotes with double quotes
    params_string = params_string.replace(/'/g, '"');

    let params: ClientOptions = JSON.parse(params_string);
    mapClient.init(params);
});
