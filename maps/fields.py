from .forms import LocationFormField
from django.contrib.gis.db.models import Field
from django.contrib.gis.geos import (

    GEOSGeometry,
    Point,
)

# Updated by Dave in August to force the SRID to 4326 on in and out operations
class Location(Field):
    description = "A custom field to store a GEOMETRY type and return GeoJSON"

    geom_type = "POINT"
    geom_class = Point
    default_srid = 4326  # Default SRID to use

    def db_type(self, connection):
        return 'GEOMETRY'

    def from_db_value(self, value, expression, connection):
        geom = GEOSGeometry(value)
        if geom and geom.srid is None:
            geom.srid = self.default_srid  # Ensure SRID is set when loading from DB
        return geom

    def get_prep_value(self, value):
        if isinstance(value, Point):
            if value.srid is None:
                value.srid = self.default_srid  # Ensure SRID is set when saving to DB
            return str(value)
        return value

    def formfield(self, **kwargs):
        defaults = {'form_class': LocationFormField, **kwargs}
        return super().formfield(**defaults)