from django.db import models
from django.contrib.gis.geos import GEOSGeometry
from django.core.exceptions import ValidationError
from .forms import LocationFormField


class Location(models.Field):
    description = "A custom field to store a GEOMETRY type and return GeoJSON"

    def __init__(self, *args, **kwargs):
        # Add any custom initialization code here
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

