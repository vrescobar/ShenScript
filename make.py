#!/usr/bin/env python

# This small script aims to be a temporary solution to run
# travis.yml commands directly from the command line for the
# time being that shen still cannot easily directly OS commands
# and run files directly from the command line

import sys
import yaml
import subprocess

try:
    travis = yaml.safe_load(open(".travis.yml", "r"))
    options = [k for (k, el) in travis.items() if type(el) == type([])]
    
except IOError as err:
    sys.stderr.write("Cannot read .travis.yml: " + repr(err))
    sys.exit(1)

def help_exit():
    sys.stderr.write("Use make <option>. Options available:\n")
    sys.stderr.write("- " + '\n- '.join((options)))
    sys.stderr.write("\n")
    sys.exit(1)

if len(sys.argv) <= 1:
    help_exit()
else:
    to_execute = sys.argv[1:]
    commands = [commands
                    for el in to_execute
                        for commands in travis[el]]
    for command in to_execute:
        if command not in options:
            sys.stderr.write("Option " + repr(el) + " not found in travis options.\n")
            help_exit()
    for command in commands:
        print command
        p = subprocess.Popen(command, shell=True, stdout=sys.stdout, stderr=sys.stderr)
        rc = p.wait()
        if rc == 0:
            continue
        else:
            print ("Failed {} with rc {}.".format(command, rc))
            sys.exit(rc)
sys.exit(0)