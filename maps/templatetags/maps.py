import json

from django import template
from django.template.loader import render_to_string

register = template.Library()


@register.simple_tag
def mapbox_simple(**kwargs):
    style = kwargs.get('style', '/mapfiles/?file=cartodb-xyz.json')
    links = kwargs.get('links', False)
    location = kwargs.get('location', False)
    maxZoom = kwargs.get('maxZoom', 15)
    minZoom = kwargs.get('minZoom', 1)
    query = kwargs.get('query', None)
    icons = kwargs.get('icons', [])
    center = kwargs.get('center', [-0.9307443, 50.7980974])
    json_url = kwargs.get('json_url', None)
    # click_url = kwargs.get('click_url', '/Map/${features[0].properties.id}/')
    click_url = kwargs.get('click_url', None)
    clickFunction = kwargs.get('clickFunction', None)
    locationFunction = kwargs.get('locationFunction', None)
    locationErrorFunction = kwargs.get('locationErrorFunction', None)
    nearFunction = kwargs.get('nearFunction', None)
    threshold = kwargs.get('threshold', 100)
    controls = kwargs.get('controls', True)
    geojson = kwargs.get('geojson', {})
    cssClass = kwargs.get('cssClass', "map")
    allClick = kwargs.get('allClick', False)
    zoom = kwargs.get('zoom', 10)
    padding = kwargs.get('padding', 50)
    fixedPrecision = kwargs.get('fixedPrecision', 14)
    updateInterval = kwargs.get('updateInterval', 10)
    fit = kwargs.get('fit', True)
    debug = kwargs.get('debug', False)
    selected = kwargs.get('selected', False)

    return render_to_string('mapbox_simple_map_insert.html', {'params':
                                                                  {'links': str(links), 'json_url': str(json_url), 'query': str(query),
                                                                   'icons': icons, 'center': str(center),
                                                                   'maxZoom': maxZoom, 'cssClass': str(cssClass),
                                                                   'style': style, 'click_url': str(click_url),
                                                                   'location': str(location),
                                                                   'allClick': str(allClick),
                                                                   'fit': str(fit),
                                                                    'debug': str(debug),
                                                                    'selected': str(selected),
                                                                    'minZoom': minZoom,
                                                                   'zoom': str(zoom),
                                                                   'padding': str(padding),
                                                                   'fixedPrecision': fixedPrecision,
                                                                   'updateInterval': updateInterval,
                                                                   'clickFunction': str(clickFunction),
                                                                   'locationFunction': str(locationFunction),
                                                                   'locationErrorFunction': str(locationErrorFunction),
                                                                   'nearFunction': str(nearFunction), 'threshold': threshold,
                                                                   'controls': str(controls), 'geojson': geojson}})

@register.simple_tag
def mapbox_simple_v2(**kwargs):
    style = kwargs.get('style', '/mapfiles/?file=cartodb-xyz.json')
    links = kwargs.get('links', False)
    location = kwargs.get('location', False)
    maxZoom = kwargs.get('maxZoom', 15)
    minZoom = kwargs.get('minZoom', 1)
    query = kwargs.get('query', None)
    icons = kwargs.get('icons', [])
    center = kwargs.get('center', [-0.9307443, 50.7980974])
    json_url = kwargs.get('json_url', None)
    # click_url = kwargs.get('click_url', '/Map/${features[0].properties.id}/')
    click_url = kwargs.get('click_url', None)
    clickFunction = kwargs.get('clickFunction', None)
    locationFunction = kwargs.get('locationFunction', None)
    locationErrorFunction = kwargs.get('locationErrorFunction', None)
    nearFunction = kwargs.get('nearFunction', None)
    threshold = kwargs.get('threshold', 100)
    controls = kwargs.get('controls', True)
    geojson = kwargs.get('geojson', {})
    cssClass = kwargs.get('cssClass', "map")
    allClick = kwargs.get('allClick', False)
    zoom = kwargs.get('zoom', 10)
    padding = kwargs.get('padding', 50)
    fixedPrecision = kwargs.get('fixedPrecision', 14)
    updateInterval = kwargs.get('updateInterval', 10)
    fit = kwargs.get('fit', True)
    debug = kwargs.get('debug', False)
    selected = kwargs.get('selected', False)
    return render_to_string('mapbox_simple_map_insert_v2.html', {'cssClass': str(cssClass),
                                                                    'params':json.dumps({'links': links, 'json_url': str(json_url), 'query': str(query),
                                                                   'icons': icons, 'center': center,
                                                                   'maxZoom': maxZoom,

                                                                   'style': style, 'click_url': str(click_url),
                                                                   'location': str(location),
                                                                   'allClick': str(allClick),
                                                                   'fit': fit,
                                                                   'debug': debug,
                                                                   'selected': str(selected),
                                                                   'minZoom': int(minZoom),
                                                                   'zoom': int(zoom),
                                                                   'padding': str(padding),
                                                                   'fixedPrecision': fixedPrecision,
                                                                   'updateInterval': updateInterval,
                                                                   'clickFunction': str(clickFunction),
                                                                   'locationFunction': str(locationFunction),
                                                                   'locationErrorFunction': str(locationErrorFunction),
                                                                   'nearFunction': str(nearFunction), 'threshold': threshold,
                                                                   'controls': controls, 'geojson': geojson})})

@register.simple_tag
def mapbox_cluster(**kwargs):
    style = kwargs.get('style', '/mapfiles/?file=cartodb-xyz.json')
    links = kwargs.get('links', False)
    location = kwargs.get('location', False)
    maxZoom = kwargs.get('maxZoom', 15)
    query = kwargs.get('query', None)
    icons = kwargs.get('icons', [])
    center = kwargs.get('center', [-0.9307443, 50.7980974])
    json_url = kwargs.get('json_url', None)
    click_url = kwargs.get('click_url', None)
    clickFunction = kwargs.get('clickFunction', None)
    locationFunction = kwargs.get('locationFunction', None)
    nearFunction = kwargs.get('nearFunction', None)
    threshold = kwargs.get('threshold', 100)
    controls = kwargs.get('controls', True)
    geojson = kwargs.get('geojson', {})
    cssClass = kwargs.get('cssClass', "map")
    allClick = kwargs.get('allClick', False)
    zoom = kwargs.get('zoom', 10)
    padding = kwargs.get('padding', 50)

    return render_to_string('mapbox_insert_cluster.html',
                            {'params':
                                 {'links': str(links), 'json_url': str(json_url), 'query': str(query),
                                  'icons': icons, 'center': str(center),
                                  'maxZoom': maxZoom, 'cssClass': str(cssClass),
                                  'style': style, 'click_url': str(click_url),
                                  'location': str(location),
                                  'allClick': str(allClick),
                                  'zoom': str(zoom),
                                  'padding': str(padding),
                                  'clickFunction': str(clickFunction),
                                  'locationFunction': str(locationFunction),
                                  'nearFunction': str(nearFunction), 'threshold': threshold,
                                  'controls': str(controls), 'geojson': geojson, 'cluster': 'True'}})

