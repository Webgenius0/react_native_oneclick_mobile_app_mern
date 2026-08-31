#!/usr/bin/env ruby

# Patch for Ruby 3.1+ Logger compatibility with ActiveSupport
require 'logger'

# Ensure Logger is available in the global namespace
Object.const_set(:Logger, Logger) unless defined?(::Logger)

# Load the original command
load File.join(Gem.bin_path('cocoapods', 'pod'))
