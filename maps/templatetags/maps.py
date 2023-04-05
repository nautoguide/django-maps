from django import template
from django.template.loader import render_to_string

register = template.Library()


@register.simple_tag
def mapbox_simple(json_url, links=False, query=None, icons=None):
    return render_to_string('mapbox_simple_map_insert.html',
                            {'links': links, 'json_url': json_url, 'query': query, 'icons': icons})


@register.simple_tag
def mapbox_cluster(json_url, icons=None):
    return render_to_string('mapbox_insert_cluster.html', {'json_url': json_url, 'icons': icons})
