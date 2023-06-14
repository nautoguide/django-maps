from .forms import LocationFormField
from django.contrib.gis.db.models import Field
from django.contrib.gis.geos import (

    GEOSGeometry,
    Point,
)


class Location(Field):
    description = "A custom field to store a GEOMETRY type and return GeoJSON"

    geom_type = "POINT"
    geom_class = Point

    def db_type(self, connection):
        return 'GEOMETRY'

    def from_db_value(self, value, expression, connection):
        return GEOSGeometry(value)

    def formfield(self, **kwargs):
        defaults = {'form_class': LocationFormField, **kwargs}
        return super().formfield(**defaults)
