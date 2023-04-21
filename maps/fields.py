from django.db import models
from django.contrib.gis.geos import GEOSGeometry
class Location(models.Field):
    description = "A custom field to store a GEOMETRY type and return GeoJSON"

    def __init__(self, *args, **kwargs):
        # Add any custom initialization code here
        super().__init__(*args, **kwargs)

    def db_type(self, connection):
        return 'GEOMETRY'

    def from_db_value(self, value, expression, connection):
        return GEOSGeometry(value)

