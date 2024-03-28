import {Map, NavigationControl} from 'maplibre-gl';
// @ts-ignore
import MapboxDraw from '@mapbox/mapbox-gl-draw';
// @ts-ignore
import * as turf from '@turf/turf';


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
    type: "add_layer" | "remove_layer" | "add_geojson" | "clear_layer" | "set_visibility" | "add_event" | "resize" | "line_draw" | "set_center";
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

    // Draw line mode
    draw_point_mode= "add";
    draw_actual_points: any[] =[];


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

        const draw = new MapboxDraw();
        this.map.addControl(
            draw,
        );

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
                    this.addGeojson(data, 'data', this.options.fit);
                })
                .catch(error => console.error(error));
        }
    }

    addGeojson(data: GeoJSON, layer_name: string = 'data', fit: boolean = false) {
        this.addQueueOperation({type: 'add_geojson', data: data, layer_name: layer_name, toggle: fit});
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
                case 'line_draw':
                    this._LineDrawMode(operation);
                    break;
                case 'set_center':
                    this.map.setCenter(operation.values);
                    break;
                case 'add_geojson':
                    const source=this.map.getSource(operation.layer_name);
                    source.setData(operation.data);
                    this.geojson[operation.layer_name] = operation.data;
                    if (this.geojson[operation.layer_name].features.length > 0) {
                        if(operation.toggle === true) {
                            const bbox = turf.bbox(this.geojson[operation.layer_name]);
                            this.map.fitBounds(bbox, {padding: this.options.padding, maxZoom: this.options.maxZoom});
                        }
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
                    console.log('Unknown Operation', operation);
                    break;
            }
            this.processQueue()
        }
    }

    // private methods

    _fuzzyMatch(point1: number,point2: number,precision: number) {
        precision=precision||0.0001;
        //console.log(`points: ${point1}:${point2} diff: ${point1-point2} - precision: ${precision}`);
        if(point1===point2&&point1===point2)
            return true;
        if(point1-precision<=point2&&point1+precision>=point2&&point1-precision<=point2&&point1+precision>=point2)
            return true;
        return false;
    }


    _findMidpoint(pointA: number[], pointB: number[]): number[]    {
        return [(pointA[0] + pointB[0]) / 2, (pointA[1] + pointB[1]) / 2];
    }

    _drawLine() {
        let line = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: this.draw_actual_points
            }
        };
        // Draw the line on the map
        this.geojson["draw-end-points"]={"type":"FeatureCollection","features":[]};
        this.geojson["draw-mid-points"]={"type":"FeatureCollection","features":[]};

        // Make the actual points geojson
        for(let i in this.draw_actual_points) {
            this.geojson["draw-end-points"].features.push({
                "type": "Feature",
                "geometry": {"coordinates": this.draw_actual_points[i], "type": "Point"},
                "properties": {"actual_index": i }
            });
        }

        // Make the mid points geojson
        for(let i=0;i<this.draw_actual_points.length-1;i++) {
            let mid_point=this._findMidpoint(this.draw_actual_points[i],this.draw_actual_points[i+1]);
            this.geojson["draw-mid-points"].features.push({
                "type": "Feature",
                "geometry": {"coordinates": [mid_point[0],mid_point[1]], "type": "Point"},
                "properties": {"actual_index": i }
            });
        }

        this.map.getSource("draw-mid-points").setData(this.geojson["draw-mid-points"]);
        this.map.getSource("draw-end-points").setData(this.geojson["draw-end-points"]);
        this.map.getSource("draw-vertex").setData(line);

    }

    _LineDrawMode(operation?: QueueOperation) {
        let moving_point: string=null;

        let self = this;


        this.map.getSource("draw-end-points").setData({"type":"FeatureCollection","features":[]});
        this.geojson["draw-end-points"] = {"type":"FeatureCollection","features":[]};

        function onMove(e: Event) {
            const coords = e.lngLat;
            self.draw_actual_points[moving_point]=[coords.lng, coords.lat];
            //_drawLine();
            self.canvas.style.cursor = 'grabbing';
        }

        function onUp(e: Event) {
            self.canvas.style.cursor = '';
            self.map.off('mousemove', onMove);
            self.map.off('touchmove', onMove);
        }

        this.map.on('mouseenter', 'draw-end-points', () => {
            self.map.setPaintProperty('draw-end-points', 'circle-color', '#3bb2d0');
            self.canvas.style.cursor = 'move';
        });

        this.map.on('mouseleave', 'draw-end-points', () => {
            self.map.setPaintProperty('draw-end-points', 'circle-color', '#D20C0C');
            self.canvas.style.cursor = '';
        });

        this.map.on('mouseenter', 'draw-mid-points', () => {
            self.map.setPaintProperty('draw-mid-points', 'circle-color', '#3bb2d0');
            self.canvas.style.cursor = 'grab';
        });

        this.map.on('mouseleave', 'draw-mid-points', () => {
            self.map.setPaintProperty('draw-mid-points', 'circle-color', '#EA580C');
            self.canvas.style.cursor = '';
        });

        this.map.on('mousedown', 'draw-end-points', (e) => {
            e.preventDefault();
            if(e.originalEvent.which===1) {
                // left click
                moving_point = e.features[0].properties.actual_index;
                self.canvas.style.cursor = 'grab';
                self.map.on('mousemove', onMove);
                self.map.once('mouseup', onUp);
            }
            if(e.originalEvent.which===3) {
                // right click
                self.draw_actual_points.splice(e.features[0].properties.actual_index,1);
                self._drawLine();
            }
        });

        this.map.on('mousedown', 'draw-mid-points', (e) => {
            e.preventDefault();
            if(e.originalEvent.which===1) {
                // add a new point at the midpoint in the array
                self.draw_actual_points.splice(e.features[0].properties.actual_index + 1, 0, [e.lngLat.lng, e.lngLat.lat]);
                self._drawLine();
                moving_point = e.features[0].properties.actual_index + 1;
                self.canvas.style.cursor = 'grab';
                self.map.on('mousemove', onMove);
                self.map.once('mouseup', onUp);
            }
        });

        // json contains a line string we need to convert to points in draw_actual_points
        if(operation&&operation.data&&operation.data.features&&operation.data.features.length>0&&operation.data.features[0].geometry&&operation.data.features[0].geometry.coordinates&&operation.data.features[0].geometry.coordinates.length>0) {
            this.draw_actual_points=operation.data.features[0].geometry.coordinates;
            // Create a line between all the points
            let line = {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: this.draw_actual_points
                }
            };
            // Draw the line on the map
            window.map.getSource("draw-vertex").setData(line);
            self._drawLine();
        }


        function addPoint(e) {
            let point = [e.lngLat.lng, e.lngLat.lat];
            const features = self.map.queryRenderedFeatures(e.point, {layers: ['draw-end-points']});

            if(self.draw_point_mode==="add") {
                if (features.length > 0) {
                    // This is a move then handled else where
                } else {
                    self.draw_actual_points.push(point);
                    // Create a line between all the points
                    self._drawLine();
                }
            } else {
                // Delete mode
                // Find any points within 10 pixels of the click
                if (features.length > 0) {
                    // Delete the point
                    // find the point in draw_actual_points using the coordinates
                    for(let i in self.draw_actual_points) {
                        // fuzzy match of coordinates by 0.0001

                        if(self._fuzzyMatch(self.draw_actual_points[i][0],features[0].geometry.coordinates[0])&&self._fuzzyMatch(self.draw_actual_points[i][1],features[0].geometry.coordinates[1])) {
                            self.draw_actual_points.splice(i,1);
                            break;
                        }
                    }
                    self._drawLine();
                }
            }
        }
        window.map.clickEvent({"hook":addPoint})
    }


    // Public Methods

    LineDrawMode(layer_name: string, toggle: boolean = true) {
        this.addQueueOperation({type: 'line_draw', layer_name: layer_name, toggle: toggle});
    }

    setLayerVisibility(layer_name: string, visibility: string) {
        this.addQueueOperation({type: 'set_visibility', layer_name: layer_name, values: {visibility: visibility}});
    }

    setCenter(center: [number, number]) {
        this.addQueueOperation({type: 'set_center', values: center});
    }

    getCenter() {
        // get center of the map
        const center = this.map.getCenter();
        // return the center as an array
        return [center.lng, center.lat];
    }

    getGeojson(layer_name: string): GeoJSON {
        return this.geojson[layer_name];
    }

    getDrawnLineString() {
        let data= {"type":"FeatureCollection","features":[{
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: this.draw_actual_points
                }
            }]};
        return data;
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
