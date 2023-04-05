# django-maps

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