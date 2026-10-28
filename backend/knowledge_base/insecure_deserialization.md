# Insecure Deserialization Prevention

## Overview

Insecure deserialization occurs when untrusted data is used to deserialize objects, which can lead to remote code execution, authentication bypass, and other attacks. This vulnerability affects many programming languages and serialization formats.

## Common Patterns

### Python Vulnerable Examples

```python
import pickle
import json
import yaml

# Vulnerable: Using pickle with untrusted data
import pickle
user_data = pickle.loads(user_input)  # Can execute arbitrary code

# Vulnerable: Using yaml.load with unsafe loader
import yaml
user_data = yaml.load(user_input, Loader=yaml.Loader)  # Can execute arbitrary code

# Vulnerable: Using eval on serialized data
import ast
user_data = ast.literal_eval(user_input)  # Limited but still risky
```

### Python Secure Examples

```python
import pickle
import json
import yaml

# Secure: Use json instead of pickle
import json
user_data = json.loads(user_input)  # Safe, no code execution

# Secure: Use yaml.SafeLoader
import yaml
user_data = yaml.load(user_input, Loader=yaml.SafeLoader)  # Safe

# Secure: Validate pickle data structure
import pickle
import struct

def safe_pickle_loads(data):
    # Only allow specific types
    allowed_types = {str, int, float, list, dict, bool, type(None)}
    obj = pickle.loads(data)
    if type(obj) not in allowed_types:
        raise ValueError("Disallowed type in pickle data")
    return obj

# Secure: Use signed serialization
import hmac
import hashlib

def sign_data(data, secret):
    return hmac.new(secret, data, hashlib.sha256).digest()

def verify_and_load(signed_data, secret):
    signature = signed_data[:32]
    data = signed_data[32:]
    if not hmac.compare_digest(signature, sign_data(data, secret)):
        raise ValueError("Invalid signature")
    return pickle.loads(data)
```

### Java Vulnerable Examples

```java
import java.io.*;

// Vulnerable: Deserializing untrusted data
ObjectInputStream ois = new ObjectInputStream(new FileInputStream("user_data.dat"));
Object obj = ois.readObject();  // Can execute arbitrary code

// Vulnerable: Using XMLDecoder
import java.beans.XMLDecoder;
XMLDecoder decoder = new XMLDecoder(new FileInputStream("user_data.xml"));
Object obj = decoder.readObject();  // Can execute arbitrary code
```

### Java Secure Examples

```java
import java.io.*;
import java.util.Base64;

// Secure: Use JSON instead of Java serialization
import com.fasterxml.jackson.databind.ObjectMapper;
ObjectMapper mapper = new ObjectMapper();
MyObject obj = mapper.readValue(jsonString, MyObject.class);

// Secure: Implement input validation
public class SafeObjectInputStream extends ObjectInputStream {
    private static final String[] ALLOWED_CLASSES = {
        "com.myapp.SafeClass",
        "java.lang.String",
        "java.util.ArrayList"
    };
    
    protected Class<?> resolveClass(ObjectStreamClass desc) 
        throws IOException, ClassNotFoundException {
        if (!isAllowed(desc.getName())) {
            throw new InvalidClassException("Unauthorized deserialization", desc.getName());
        }
        return super.resolveClass(desc);
    }
    
    private boolean isAllowed(String className) {
        for (String allowed : ALLOWED_CLASSES) {
            if (className.startsWith(allowed)) {
                return true;
            }
        }
        return false;
    }
}

// Secure: Use signed serialization
import javax.crypto.*;
import javax.crypto.spec.*;
import java.security.*;

public SignedObject serialize(Object obj, SecretKey key) 
    throws IOException, InvalidKeyException {
    return new SignedObject(obj, key, Signature.getInstance("SHA256withRSA"));
}

public Object deserialize(SignedObject signedObj, PublicKey key) 
    throws IOException, ClassNotFoundException, InvalidKeyException, SignatureException {
    if (!signedObj.verify(key, Signature.getInstance("SHA256withRSA"))) {
        throw new SecurityException("Invalid signature");
    }
    return signedObj.getObject();
}
```

## Prevention Strategies

1. **Avoid deserialization of untrusted data**: Never deserialize data from untrusted sources
2. **Use safe serialization formats**: Use JSON, XML with safe parsers, or protocol buffers
3. **Implement integrity checks**: Use digital signatures or HMACs to verify data integrity
4. **Validate types**: Implement allowlists for allowed classes during deserialization
5. **Use safe libraries**: Use SafeLoader in YAML, avoid pickle in Python
6. **Isolate deserialization**: Run deserialization in sandboxed environments
7. **Monitor for anomalies**: Log and alert on deserialization attempts

## Detection Patterns

- Look for pickle.loads(), pickle.load() in Python
- Check for yaml.load() without SafeLoader
- Identify ObjectInputStream.readObject() in Java
- Look for XMLDecoder usage in Java
- Check for eval() on serialized data
- Identify missing signature verification on serialized data

## Severity: Critical

Insecure deserialization typically results in:
- Remote code execution
- Authentication bypass
- Privilege escalation
- Denial of service
- Complete system compromise

## Common Attack Vectors

1. **Python pickle**: Arbitrary code execution through __reduce__ methods
2. **Java serialization**: Gadgets chains for RCE (Commons Collections, etc.)
3. **YAML unsafe loading**: Arbitrary code execution through !!python/object tags
4. **PHP serialization**: Object injection through autoloading
5. **Node.js**: Prototype pollution through unsafe JSON parsing

## Mitigation Examples

### Python
```python
# Use json instead of pickle
import json
data = json.loads(user_input)

# Use SafeLoader for YAML
import yaml
data = yaml.safe_load(user_input)

# Implement type checking
def safe_load(data):
    obj = pickle.loads(data)
    if not isinstance(obj, (str, int, float, list, dict, bool, type(None))):
        raise TypeError("Invalid type")
    return obj
```

### Java
```java
// Use JSON instead of Java serialization
ObjectMapper mapper = new ObjectMapper();
MyObject obj = mapper.readValue(jsonString, MyObject.class);

// Implement class filtering
ObjectInputStream filter = new ObjectInputStream(inputStream) {
    @Override
    protected Class<?> resolveClass(ObjectStreamClass desc) 
        throws IOException, ClassNotFoundException {
        if (!desc.getName().startsWith("com.myapp.")) {
            throw new InvalidClassException("Unauthorized class");
        }
        return super.resolveClass(desc);
    }
};
```
