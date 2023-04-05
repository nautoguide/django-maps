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

Despite usermode you may need the sudo


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

## Using maps in your templates

To any template where you need a map add:

```html
{% load maps %}
```

Then for a map add

```html
<!- Simple map with links -->
{% mapbox_simple json_url True None icons %}

<!- Simple map with links -->
{% mapbox_cluster json_url %}
```

## Development

Build the package

```
python3 setup.py sdist
```