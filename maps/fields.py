from django.db import models
from django.contrib.gis.geos import GEOSGeometry
from .forms import LocationFormField


class Location(models.Field):
    description = "A custom field to store a GEOMETRY type and return GeoJSON"

    def __init__(self, *args, map_center=None, **kwargs):
        # Add any custom initialization code here
        self.map_center = map_center
        #kwargs['blank'] = kwargs.get('blank', True)
        #kwargs['null'] = kwargs.get('null', True)
        super().__init__(*args, **kwargs)

    def db_type(self, connection):
        return 'GEOMETRY'

    def from_db_value(self, value, expression, connection):
        return GEOSGeometry(value)

    def formfield(self, **kwargs):
        defaults = {'form_class': LocationFormField, **kwargs}
        return super().formfield(**defaults)

    def widget_attrs(self, widget):
        attrs = super().widget_attrs(widget)
        if self.map_center is not None:
            attrs.update({'data-map_center': self.map_center})
        return attrs