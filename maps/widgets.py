from django.forms.widgets import Widget
from django.template.loader import render_to_string

class LocationWidget(Widget):
    template_name = 'admin/field_widget_location.html'

    def render(self, name, value, attrs=None, renderer=None):
        context = self.get_context(name, value, attrs)
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