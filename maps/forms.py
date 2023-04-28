from django import forms
from .widgets import LocationWidget


class LocationFormField(forms.Field):
    #widget = LocationWidget

    def __init__(self, *args, map_center=None, **kwargs):
        #print(map_center)
        self.map_center = map_center
        self.widget = LocationWidget(map_center=self.map_center)
        super().__init__(*args, **kwargs)

    def widget_attrs(self, widget):
        attrs = super().widget_attrs(widget)
        attrs.update({"map_center": self.map_center})
        attrs.update({"foo": "bar"})
        #print(attrs)
        return attrs

