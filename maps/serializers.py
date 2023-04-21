
from django.forms.models import model_to_dict
import json


def feature_serialize_geojson(queryset, more, properties=["category", "id"]):
    serialized_data = []
    for obj in queryset:
        # Combine fields from parent and child classes
        combined_data = model_to_dict(obj)

        local_properties = {}
        for prop in properties:
            if prop in combined_data:
                local_properties[prop] = combined_data[prop]

        feature = {'geometry': json.loads(obj.location.geojson), 'properties': local_properties}

        serialized_data.append(feature)

    geojson_data = {
        "type": "FeatureCollection",
        "features": serialized_data,
        'more': more
    }
    return geojson_data
