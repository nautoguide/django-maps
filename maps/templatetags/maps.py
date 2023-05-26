from django import template
from django.template.loader import render_to_string

register = template.Library()


@register.simple_tag
def mapbox_simple(**kwargs):
    style = kwargs.get('style', '/mapfiles/?file=cartodb-xyz.json')
    links = kwargs.get('links', False)
    location = kwargs.get('location', False)
    maxZoom = kwargs.get('maxZoom', 15)
    query = kwargs.get('query', None)
    icons = kwargs.get('icons', [])
    center = kwargs.get('center', [-0.9307443, 50.7980974])
    json_url = kwargs.get('json_url', None)
    # click_url = kwargs.get('click_url', '/Map/${features[0].properties.id}/')
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

    return render_to_string('mapbox_simple_map_insert.html', {'params':
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
                                                                   'controls': str(controls), 'geojson': geojson}})


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

