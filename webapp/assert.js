function assert(value, desc) {
    if (!value) {
        perror("Assertion failed: " + desc);
    }
}
