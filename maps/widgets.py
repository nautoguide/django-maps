from django.forms.widgets import Widget

class LocationWidget(Widget):
    template_name = 'admin/field_widget_location.html'

    map_center = [-0.9307443, 50.7980974]

    def __init__(self, attrs=None):
        self.attrs = {}
        for key in ("map_center", ):
            if attrs and key in attrs:
                self.attrs[key] = attrs[key]
            else:
                self.attrs[key] = getattr(self, key)
        if attrs:
            self.attrs.update(attrs)


    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        return context


    class Media:
        js = (
            '/static/js/maplibre-gl.js',
            '/static/js/mapbox-admin.js',
        )

        css = {
            'all': (
                '/static/css/maplibre-gl-admin.css',
            )
        }