import re

files = ["public/dashboard.html", "public/app.js"]
for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Do replacements
    content = content.replace("Inferred", "Verified")
    content = content.replace("inferred", "verified")
    content = content.replace("Inferences", "Validations")
    content = content.replace("inferences", "validations")
    content = content.replace("Inference", "Validation")
    content = content.replace("inference", "validation")
    content = content.replace("infers", "verifies")
    content = content.replace("infer", "verify")
    content = content.replace("Infer", "Verify")
    
    with open(f, 'w') as file:
        file.write(content)
print("Done")
