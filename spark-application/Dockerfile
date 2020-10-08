FROM openjdk:11-jdk-slim AS sbt

# Env variables
ENV SCALA_VERSION 2.12.11
ENV SBT_VERSION 1.3.10

# Install Scala
## Piping curl directly in tar
RUN \
    apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/cache/apt/* && \
    curl -fsL https://downloads.typesafe.com/scala/$SCALA_VERSION/scala-$SCALA_VERSION.tgz | tar xfz - -C /root/ && \
    echo >> /root/.bashrc && \
    echo "export PATH=~/scala-$SCALA_VERSION/bin:$PATH" >> /root/.bashrc

# Install sbt
RUN \
    curl -L -o sbt-$SBT_VERSION.deb https://dl.bintray.com/sbt/debian/sbt-$SBT_VERSION.deb && \
    dpkg -i sbt-$SBT_VERSION.deb && \
    rm sbt-$SBT_VERSION.deb && \
    apt-get update && \
    apt-get install sbt && \
    sbt sbtVersion



FROM openjdk:11-jre-slim AS spark

ENV SPARK_VERSION 3.0.0
ENV HADOOP_VERSION 3.2

ARG spark_home=/spark/spark-$SPARK_VERSION-bin-hadoop$HADOOP_VERSION
#ARG spark_home=/spark/spark-$SPARK_VERSION-bin-without-hadoop

RUN set -ex && \
    apt-get update && \
    ln -s /lib /lib64 && \
    apt install -y curl bash tini libc6 libpam-modules krb5-user libnss3 && \
    rm -rf /var/cache/apt/* && \
    mkdir -p /opt/spark && \
    mkdir -p /opt/spark/examples && \
    mkdir -p /opt/spark/work-dir && \
    touch /opt/spark/RELEASE && \
    rm /bin/sh && \
    ln -sv /bin/bash /bin/sh && \
    echo "auth required pam_wheel.so use_uid" >> /etc/pam.d/su && \
    chgrp root /etc/passwd && chmod ug+rw /etc/passwd && \
    rm -rf /var/cache/apt/* && \
    mkdir -p /spark/ && \
    curl -fsL https://archive.apache.org/dist/spark/spark-$SPARK_VERSION/spark-$SPARK_VERSION-bin-hadoop$HADOOP_VERSION.tgz | tar xfz - -C /spark/ && \
    cp -R ${spark_home}/jars /opt/spark/jars && \
    cp -R ${spark_home}/bin /opt/spark/bin && \
    cp -R ${spark_home}/sbin /opt/spark/sbin && \
    cp -R ${spark_home}/kubernetes/dockerfiles/spark/entrypoint.sh /opt/ && \
    rm -Rf ${spark_home}



FROM sbt AS build

RUN \
mkdir project && \
echo "scalaVersion := \"${SCALA_VERSION}\"" > build.sbt && \
echo "sbt.version=${SBT_VERSION}" > project/build.properties && \
echo "case object Temp" > Temp.scala && \
sbt compile && \
rm -r project && rm build.sbt && rm Temp.scala && rm -r target

# Define working directory
WORKDIR /opt/input

# Project Definition layers change less often than application code
COPY build.sbt ./

WORKDIR /opt/input/project
# COPY project/*.scala ./
COPY project/build.properties ./
COPY project/*.sbt ./

WORKDIR /opt/input
RUN sbt reload

# Copy rest of application
COPY . ./
RUN sbt clean assembly





FROM spark AS final

COPY --from=build /opt/input/target/scala-2.12/spark-on-eks-assembly-v2.jar  /opt/spark/jars

ENV SPARK_HOME /opt/spark

WORKDIR /opt/spark/work-dir

ENTRYPOINT [ "/opt/entrypoint.sh" ]
