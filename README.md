# django-maps

## Install

Local dev mode using built package

```
python3 -m pip install --user ~/projects/django-maps/dist/django-maps-0.1.tar.gz
```


Local dev mode in edit mode

```
sudo python3 -m pip install --user -e ~/projects/django-maps
```

Despite usermode you may need the sudo and note that you will need to restart the runserver process on
the local project your editing to see some changes


From github
```
pip install git+https://github.com/nautoguide/django-maps.git
```

If your using requirements.txt

```
git+https://github.com/nautoguide/django-maps.git
```

## Quick start


Add 'maps' to your INSTALLED_APPS apps

```
    INSTALLED_APPS = [
        ...
        'maps',
    ]
```

## Adding a map location to your model

in models.py

```
from maps.fields import Location


class Feature(models.Model):
    title = models.CharField(null=True, max_length=200, help_text="Title of feature")
    location = Location()

```

This will use a default map, if you want to provide settings to the admin map then in admin.py

```
defs = {
    'attrs': {
        'map_center': [-4.142467699252791,50.369191887081485]
    }
}

class MyModelAdmin(admin.ModelAdmin):
    .....
    formfield_overrides = {
        Location: {"widget": LocationWidget(attrs=defs['attrs'])},
    }
```

## Using maps in your templates

To any template where you need a map add:

```html
{% load maps %}
```

Then for a map add

```html
<!- Simple map  -->
{% mapbox_simple json_url=json_url icons=icons style='/mapfiles/?file=os-styles.json' maxZoom=20 center='[-3.510486, 50.395822]' %}

<!- Simple map with links -->
{% mapbox_cluster json_url %}
```

### json_url string

This points the map at the location to get its geojson, normally this would be an api end point that returns geojson
from the database

### links True|False

Add a links layer base on the geojson.

### icons array

For icon you need to pass in an array of icons to use and their references. A good way to do this is have them 
defined in your view in a single place and then pass them into the view context that uses the map:

```python
icons = [
    {
        'name': 'sailor',
        'url': "/static/map_images/map_sailor.png",
    },
    {
        'name': 'ship',
        'url': "/static/map_images/map_ship.png",
    },
    {
        'name': 'homeport',
        'url': "/static/map_images/map_artefact.png",
    },
    {
        'name': 'memorial',
        'url': "/static/map_images/map_memorial.png",
    },
    {
        'name': 'school',
        'url': "/static/map_images/map_school.png",
    },
    {
        'name': 'submarine',
        'url': "/static/map_images/map_submarine.png",
    }
]

def map(request):
    context = {
        'page_title': 'Mappy',
        'json_url': "/Map/API/json/",
        'icons': icons
    }
    return render(request, 'map.html', context)
```

```
{% load maps %}

{% mapbox_simple json_url=json_url links=True icons=icons %}

```

To use the goejson serializer:

```python
from maps.serializers import feature_serialize_geojson

geojson = feature_serialize_geojson(features, False)
```

If you need to use the mapfiles included with maps then you need to include a urls.py to cope with it as we
use template processing to deal with live and local urls:

```python
from maps.views import mapfiles


urlpatterns = [
    path('Admin/',  admin.site.urls),
   ....
    path('mapfiles/', mapfiles)

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

## Development

Build the package

```
python3 setup.py sdist
```