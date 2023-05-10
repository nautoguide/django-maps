from django import template
from django.template.loader import render_to_string

register = template.Library()


@register.simple_tag
def mapbox_simple(**kwargs):
    style = kwargs.get('style', 'mapfiles/?file=cartodb-xyz.json')
    links = kwargs.get('links', False)
    location = kwargs.get('location', False)
    maxZoom = kwargs.get('maxZoom', 15)
    query = kwargs.get('query', None)
    icons = kwargs.get('icons', [])
    center = kwargs.get('center', [-0.9307443, 50.7980974])
    json_url = kwargs.get('json_url', None)
    #click_url = kwargs.get('click_url', '/Map/${features[0].properties.id}/')
    click_url = kwargs.get('click_url', None)
    clickFunction = kwargs.get('clickFunction', None)
    locationFunction = kwargs.get('locationFunction', None)
    nearFunction = kwargs.get('nearFunction', None)
    threshold = kwargs.get('threshold', 100)

    return render_to_string('mapbox_simple_map_insert.html',
                            {'links': links, 'json_url': json_url, 'query': query, 'icons': icons, 'center': center,
                             'maxZoom': maxZoom,
                             'style': style, 'click_url': click_url, 'location': location,
                             'clickFunction': clickFunction, 'locationFunction': locationFunction,
                             'nearFunction': nearFunction,'threshold': threshold})


@register.simple_tag
def mapbox_cluster(**kwargs):
    center = kwargs.get('center', [-0.9307443, 50.7980974])
    icons = kwargs.get('icons', [])
    json_url = kwargs.get('json_url', None)
    return render_to_string('mapbox_insert_cluster.html', {'json_url': json_url, 'icons': icons, 'center': center})
