from django.forms.widgets import Widget
from django.template.loader import render_to_string

class LocationWidget(Widget):
    template_name = 'admin/field_widget_location.html'

    def __init__(self, attrs=None, map_center=None, **kwargs):
        #self.map_center = map_center
        if attrs is None:
            attrs = {}
        if map_center is not None:
            attrs.update({'data-center': map_center})
        super().__init__(attrs=attrs, **kwargs)

    def render(self, name, value, attrs=None, renderer=None):
        context = self.get_context(name, value, attrs)
        print("here")
        print( attrs.get('map_center'))
        context['map_center'] = attrs.get('map_center')
        return render_to_string(self.template_name, context)

    class Media:
        js = (
            '/static/js/maplibre-gl.js',
            '/static/js/mapbox-admin.js',
        )

        css = {
            'all': (
                '/static/css/maplibre-gl.css',
            )
        }