from app.agents.remediation import heal_syntax_and_quality_code
from app.services.code_validator import validate_code

# Test 1: binary_search with unindented left = 0
binary_search_bad = """def binary_search(arr, target):
left = 0
    right = len(arr) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1
"""

healed_1 = heal_syntax_and_quality_code(binary_search_bad, "python")
val_1 = validate_code(healed_1, "python")
print("TEST 1 — Binary Search Healed Valid Syntax:", val_1.is_valid)
print("Healed Code:\n", healed_1)

# Test 2: process_user_data with missing closing parenthesis and deep nesting
process_user_data_bad = """def process_user_data(user_id, data):
    if user_id is not None:
        if data is not None:
            if len(data) > 0:
                if "email" in data:
                    if data["email"] != "":
                        if data["email"].endswith("@gmail.com"):
                            print("Valid email")
                        else:
                            print("Invalid email")
                    else:
                        print("Empty email")
                else:
                    print("Email missing")
            else:
                print("Data is empty")
        else:
            print("Data is None")
    else:
        print("User ID is missing"
"""

healed_2 = heal_syntax_and_quality_code(process_user_data_bad, "python")
val_2 = validate_code(healed_2, "python")
print("\nTEST 2 — Process User Data Healed Valid Syntax:", val_2.is_valid)
print("Healed Code:\n", healed_2)
