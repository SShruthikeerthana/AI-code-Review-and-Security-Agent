import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app.models.submission import Language
from app.services.code_validator import detect_language


def test_detect_python_code():
    code = """
def calculate_total(items):
    total = 0
    for item in items:
        total += item.get('price', 0)
    return total
"""
    assert detect_language(code) == Language.python


def test_detect_java_code():
    code = """
public class CalculatorService {
    private double taxRate = 0.18;

    public double calculateTotal(double price) {
        System.out.println("Calculating price");
        return price + (price * taxRate);
    }
}
"""
    assert detect_language(code) == Language.java


def test_detect_language_by_filename():
    code = "x = 10"
    assert detect_language(code, filename="script.py") == Language.python
    assert detect_language(code, filename="Script.java") == Language.java


def test_detect_python_snippet_with_syntax_errors():
    code = """
def process_data(data
    for x in data
        print(x
"""
    assert detect_language(code) == Language.python


def test_detect_java_snippet_with_syntax_errors():
    code = """
public class InvalidJava {
    public void run() {
        System.out.println("hello"
        int a = 5
    }
}
"""
    assert detect_language(code) == Language.java
