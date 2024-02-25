# CLion remote docker environment (How to build docker container, run and stop it)
#
# Build and run:
#   docker build -t clion/remote-cpp-env:1.0 -f src/Docker/cpp-env-debian.Dockerfile .
#   docker run -d --cap-add sys_ptrace -p127.0.0.1:2222:22 --name clion_remote_env clion/remote-cpp-env:1.0
#   ssh-keygen -f "$HOME/.ssh/known_hosts" -R "[localhost]:2222"
#
# stop:
#   docker stop clion_remote_env
#
# ssh credentials (test user):
#   user@password

FROM debian:bullseye

RUN DEBIAN_FRONTEND="noninteractive" apt-get update && apt-get -y install tzdata

RUN apt-get update \
  && apt-get install -y ssh \
      build-essential \
      gcc \
      g++ \
      gdb \
      clang \
      make \
      ninja-build \
      cmake \
      autoconf \
      automake \
      locales-all \
      dos2unix \
      rsync \
      tar \
      python \
      liblog4cxx-dev \
      liblog4cxx-doc \
      liblog4cxx11 \
      liblog4cplus-2.0.5 \
      liblog4cplus-dev \
      liblog4cplus-doc  \
      liblog4cplus-dev \
      liblog4cplus-doc \
      liblog4cpp5-dev \
      liblog4cpp5v5 \
      libssl-dev \
      libssl-doc \
      libssl1.1 \
      libboost-all-dev \
  && apt-get clean

# You probably need to update this line!
COPY src/Docker/sources.list /etc/apt/

RUN ( \
    echo 'LogLevel DEBUG2'; \
    echo 'PermitRootLogin yes'; \
    echo 'PasswordAuthentication yes'; \
    echo 'Subsystem sftp /usr/lib/openssh/sftp-server'; \
  ) > /etc/ssh/sshd_config_test_clion \
  && mkdir /run/sshd

RUN useradd -m user \
  && yes password | passwd user

RUN usermod -s /bin/bash user
RUN usermod -aG sudo user

CMD ["/usr/sbin/sshd", "-D", "-e", "-f", "/etc/ssh/sshd_config_test_clion"]

# Run these inside container:
# apt update && apt upgrade -y --force-yes -qq
