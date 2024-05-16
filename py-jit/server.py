from flask import Flask, request, jsonify, Response
from flask_restful import Resource, Api
from RestrictedPython import compile_restricted, safe_globals
import requests
import tempfile
import os
from typing import Dict, Any

app: Flask = Flask(__name__)
api: Api = Api(app)

class ExecuteCode(Resource):
    def post(self) -> Response:
        try:
            # Get the Python code from the request
            code: str = request.data.decode('utf-8')
            
            # Get the data source URL and file format from the request headers
            data_url: str = request.headers.get('Data-URL')
            file_format: str = request.headers.get('File-Format')
            
            # Fetch the data from the URL
            response: requests.Response = requests.get(data_url)
            if response.status_code != 200:
                return jsonify({'error': 'Failed to fetch data from the provided URL'}), 400
            
            # Save the fetched data to a temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False)
            temp_file.write(response.content)
            temp_file.close()
            
            # Create a sandboxed environment
            exec_globals: Dict[str, Any] = safe_globals.copy()
            exec_globals['__builtins__'] = safe_globals['__builtins__']
            exec_globals['data_file'] = temp_file.name

            # Compile the provided code
            byte_code = compile_restricted(code, '<string>', 'exec')
            
            # Execute the compiled code in the sandboxed environment
            exec(byte_code, exec_globals)
            
            # Remove the temporary file
            os.remove(temp_file.name)
            
            return jsonify({'result': 'Code executed successfully'}), 200
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500

api.add_resource(ExecuteCode, '/execute')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)