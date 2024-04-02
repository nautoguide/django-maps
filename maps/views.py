import json
from django.http import JsonResponse
from django.shortcuts import render
from django.conf import settings


def mapfiles(request):
    host = request.get_host()
    print(request.get_host())
    file = request.GET.get('file')
    scheme = 'http'
    if request.scheme == 'https' or request.META.get('HTTP_X_FORWARDED_PROTO') == 'https' or request.META.get(
            'X_FORWARDED_PROTO') == 'https':
        scheme = 'https'
    api_key = None
    if hasattr(settings, 'MAP_API_KEY'):
        api_key = settings.MAP_API_KEY
    context = {
        'host': host,
        'scheme': scheme,
        'MAP_API_KEY': api_key,

    }
    file_actual = f'map_styles/{file}'

    rendered_template = render(request, file_actual, context)
    json_data = json.loads(rendered_template.content.decode())

    # Load json file from the includes
    for include in json_data.get('includes', []):
        file_actual = f'{include}'
        rendered_template = render(request, file_actual, context)
        json_data_include = json.loads(rendered_template.content.decode())
        # Merge the json data
        if json_data_include.get('sources'):
            json_data.get('sources').update(json_data_include.get('sources'))
        if json_data_include.get('layers'):
            json_data.get('layers').extend(json_data_include.get('layers'))


    # delete includes
    if json_data.get('includes'):
        del json_data['includes']

    return JsonResponse(json_data)
